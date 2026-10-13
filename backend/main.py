from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
import uuid
from pathlib import Path
from pydub import AudioSegment
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI()

OUTPUT_DIR = Path("output_texts")
OUTPUT_DIR.mkdir(exist_ok=True)
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

CHUNK_LENGTH_MS = 15 * 60 * 1000  # 15 minutes
OVERLAP_MS = 10 * 1000  # 10 seconds overlap

tasks = {}

def process_transcription(task_id: str, file_path: Path, mode: str, base_name: str, final_output_path: Path):
    try:
        audio = AudioSegment.from_file(file_path)
        total_ms = len(audio)
        total_minutes = total_ms / (1000 * 60)
        cost = round(total_minutes * 0.006, 4)
        tasks[task_id]["cost"] = cost

        if mode == "full":
            with open(file_path, "rb") as audio_file:
                transcript = client.audio.transcriptions.create(
                    model="whisper-1", 
                    file=audio_file,
                    language="it"
                )
            
            with open(final_output_path, "w", encoding="utf-8") as f:
                f.write(transcript.text)
                
            tasks[task_id]["text"] = transcript.text
            tasks[task_id]["progress"] = 100
            tasks[task_id]["status"] = "completed"

        elif mode == "batched":
            full_text = ""
            chunk_index = 0
            start_ms = 0
            
            total_chunks = 0
            temp_start = 0
            while temp_start < total_ms:
                total_chunks += 1
                temp_start += CHUNK_LENGTH_MS - OVERLAP_MS

            while start_ms < total_ms:
                end_ms = start_ms + CHUNK_LENGTH_MS
                chunk = audio[start_ms:end_ms]
                
                chunk_file_path = UPLOAD_DIR / f"{base_name}_chunk_{chunk_index}.mp3"
                chunk_text_path = OUTPUT_DIR / f"{base_name}_chunk_{chunk_index}.txt"
                
                if chunk_text_path.exists():
                    with open(chunk_text_path, "r", encoding="utf-8") as f:
                        chunk_text = f.read()
                else:
                    chunk.export(chunk_file_path, format="mp3")
                    
                    with open(chunk_file_path, "rb") as audio_file:
                        transcript = client.audio.transcriptions.create(
                            model="whisper-1", 
                            file=audio_file,
                            language="it",
                            prompt=full_text[-1000:] if full_text else ""
                        )
                    chunk_text = transcript.text
                    
                    with open(chunk_text_path, "w", encoding="utf-8") as f:
                        f.write(chunk_text)
                
                full_text += chunk_text + " "
                
                start_ms += CHUNK_LENGTH_MS - OVERLAP_MS
                chunk_index += 1
                
                tasks[task_id]["progress"] = int((chunk_index / total_chunks) * 100)
                
            with open(final_output_path, "w", encoding="utf-8") as f:
                f.write(full_text.strip())
                
            tasks[task_id]["text"] = full_text.strip()
            tasks[task_id]["progress"] = 100
            tasks[task_id]["status"] = "completed"

    except Exception as e:
        tasks[task_id]["status"] = "error"
        tasks[task_id]["error"] = str(e)


@app.post("/upload")
async def upload_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    mode: str = Form(...)
):
    if mode not in ["full", "batched"]:
        raise HTTPException(status_code=400, detail="Invalid mode.")
        
    task_id = str(uuid.uuid4())
    tasks[task_id] = {
        "status": "processing",
        "progress": 0,
        "text": None,
        "cost": 0.0,
        "error": None
    }
    
    file_path = UPLOAD_DIR / f"{task_id}_{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    base_name = file_path.stem
    final_output_path = OUTPUT_DIR / f"{base_name}.txt"
    
    background_tasks.add_task(process_transcription, task_id, file_path, mode, base_name, final_output_path)
    
    return {"task_id": task_id}

@app.get("/status/{task_id}")
async def get_status(task_id: str):
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    return tasks[task_id]
