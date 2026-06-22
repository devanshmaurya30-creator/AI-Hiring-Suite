"""
File Handling Utilities

Validates uploaded files, saves them to disk, and extracts text
from PDF and DOCX documents.
"""

import os
import uuid
import aiofiles
from fastapi import UploadFile, HTTPException, status
import PyPDF2
import docx

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

def validate_file(file: UploadFile) -> bool:
    """
    Validate file extension and file size.
    Raises HTTPException on validation failure.
    """
    filename = file.filename or ""
    _, ext = os.path.splitext(filename.lower())
    
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format. Only PDF and DOCX are allowed."
        )
        
    # Checking file size. Note: FastAPI's file.file might not support direct size checking
    # easily without reading, so we can seek or read a chunk.
    try:
        # Seek to end to check size, then seek back
        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)
        
        if size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File is too large. Maximum size allowed is 10MB."
            )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        # If seek is not supported by file, we skip size check and check it during write
        pass
        
    return True

async def save_upload(file: UploadFile, upload_dir: str) -> str:
    """
    Save an uploaded file asynchronously to the specified directory.
    Generates a unique filename to prevent overwrite.
    Returns the absolute path of the saved file.
    """
    os.makedirs(upload_dir, exist_ok=True)
    
    filename = file.filename or "uploaded_file"
    _, ext = os.path.splitext(filename.lower())
    unique_filename = f"{uuid.uuid4()}{ext}"
    dest_path = os.path.join(upload_dir, unique_filename)
    
    bytes_written = 0
    async with aiofiles.open(dest_path, "wb") as out_file:
        while content := await file.read(1024 * 1024):  # 1MB chunks
            bytes_written += len(content)
            if bytes_written > MAX_FILE_SIZE:
                # Cleanup and raise
                await out_file.close()
                if os.path.exists(dest_path):
                    os.remove(dest_path)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File exceeds maximum size of 10MB during transfer."
                )
            await out_file.write(content)
            
    return os.path.abspath(dest_path)

def get_file_text(file_path: str) -> str:
    """
    Extract text content from a PDF or DOCX file.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
        
    _, ext = os.path.splitext(file_path.lower())
    
    if ext == ".pdf":
        return _extract_pdf_text(file_path)
    elif ext == ".docx":
        return _extract_docx_text(file_path)
    else:
        raise ValueError(f"Cannot extract text from unsupported extension: {ext}")

def _extract_pdf_text(file_path: str) -> str:
    """Extract text from a PDF file using PyPDF2."""
    text_content = []
    try:
        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page_num in range(len(reader.pages)):
                page = reader.pages[page_num]
                page_text = page.extract_text()
                if page_text:
                    text_content.append(page_text)
        return "\n".join(text_content)
    except Exception as e:
        raise RuntimeError(f"Failed to parse PDF file: {e}")

def _extract_docx_text(file_path: str) -> str:
    """Extract text from a DOCX file using python-docx."""
    try:
        doc = docx.Document(file_path)
        text_content = []
        for paragraph in doc.paragraphs:
            if paragraph.text.strip():
                text_content.append(paragraph.text)
        return "\n".join(text_content)
    except Exception as e:
        raise RuntimeError(f"Failed to parse DOCX file: {e}")
