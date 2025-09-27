from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from typing import Optional
import os
import logging
import time
import traceback
from datetime import datetime

# Load environment variables from .env/.env.local (repo root or agent dir) if present
try:
    from dotenv import load_dotenv  # type: ignore
except Exception:
    load_dotenv = None  # python-dotenv may not be installed yet

def _load_env_files() -> None:
    if load_dotenv is None:
        return
    here = Path(__file__).resolve()
    candidates = [
        here.parents[2] / ".env.local",  # repo root/.env.local
        here.parents[2] / ".env",        # repo root/.env
        here.parents[1] / ".env.local",  # agent/.env.local
        here.parents[1] / ".env",        # agent/.env
    ]
    for p in candidates:
        if p.exists():
            load_dotenv(p, override=False)

_load_env_files()

from .agent import agentic_chat_router
from .sheets_integration import get_sheet_data, convert_sheet_to_canvas_items, sync_canvas_to_sheet, get_sheet_names, create_new_sheet
from .sales_pitch_agent import sales_pitch_agent, SalesPitchAgent, CompanyInfo
from llama_index.protocols.ag_ui.router import get_ag_ui_workflow_router
from llama_index.llms.openai import OpenAI

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('pitch_agent.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Pitch Evaluation Agent",
    description="AI-powered sales pitch evaluation system with real-time feedback",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    logger.info(f"Request: {request.method} {request.url}")
    
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        logger.info(f"Response: {response.status_code} - {process_time:.3f}s")
        return response
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(f"Error: {str(e)} - {process_time:.3f}s")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise

app.include_router(agentic_chat_router)

# Create sales pitch router
sales_pitch_router = get_ag_ui_workflow_router(
    llm=OpenAI(model="gpt-4.1"),
    frontend_tools=[],  # No frontend tools needed for sales pitch
    backend_tools=[sales_pitch_agent._create_update_checklist_tool()],
    system_prompt="""You are a sales pitch evaluation assistant.""",
    initial_state={
        "conversation_states": {},
        "active_conversations": []
    }
)
app.include_router(sales_pitch_router, prefix="/sales-pitch")

# Request models
class SheetSyncRequest(BaseModel):
    sheet_id: str
    sheet_name: Optional[str] = None

class CanvasToSheetSyncRequest(BaseModel):
    canvas_state: dict
    sheet_id: str
    sheet_name: Optional[str] = None

class CreateSheetRequest(BaseModel):
    title: str

class InitializePitchRequest(BaseModel):
    conversation_id: str
    company_info: dict

class EvaluatePitchRequest(BaseModel):
    conversation_id: str
    message: str

class GetPitchStatusRequest(BaseModel):
    conversation_id: str

class SendEmailRequest(BaseModel):
    to_email: str
    subject: str
    body: str
    company_name: str

# Global metrics
metrics = {
    "total_pitches": 0,
    "successful_pitches": 0,
    "failed_pitches": 0,
    "emails_sent": 0,
    "start_time": datetime.now().isoformat()
}

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "uptime": (datetime.now() - datetime.fromisoformat(metrics["start_time"])).total_seconds(),
        "metrics": metrics
    }

# Metrics endpoint
@app.get("/metrics")
async def get_metrics():
    """Get system metrics for observability."""
    return {
        "pitch_metrics": {
            "total_pitches": metrics["total_pitches"],
            "successful_pitches": metrics["successful_pitches"],
            "failed_pitches": metrics["failed_pitches"],
            "success_rate": metrics["successful_pitches"] / max(metrics["total_pitches"], 1) * 100
        },
        "email_metrics": {
            "emails_sent": metrics["emails_sent"]
        },
        "system": {
            "start_time": metrics["start_time"],
            "uptime_seconds": (datetime.now() - datetime.fromisoformat(metrics["start_time"])).total_seconds()
        }
    }

# Sheets sync endpoint
@app.post("/sheets/sync")
async def sync_sheets(request: SheetSyncRequest):
    """
    Sync data from Google Sheets to canvas format.
    
    Args:
        request: Contains sheet_id to import from
        
    Returns:
        Canvas state with items converted from sheet data
    """
    try:
        # Extract sheet ID from URL if full URL is provided
        sheet_id = request.sheet_id
        if "/spreadsheets/d/" in sheet_id:
            # Extract ID from Google Sheets URL
            start = sheet_id.find("/spreadsheets/d/") + len("/spreadsheets/d/")
            end = sheet_id.find("/", start)
            if end == -1:
                end = sheet_id.find("#", start)
            if end == -1:
                end = len(sheet_id)
            sheet_id = sheet_id[start:end]
        
        sheet_name = request.sheet_name
        if sheet_name:
            print(f"Syncing sheet: {sheet_id} (sheet: {sheet_name})")
        else:
            print(f"Syncing sheet: {sheet_id} (default sheet)")
        
        # Fetch sheet data using Composio
        sheet_data = get_sheet_data(sheet_id, sheet_name)
        if not sheet_data:
            raise HTTPException(
                status_code=400, 
                detail="Failed to fetch sheet data. Please check the sheet ID and ensure it's accessible."
            )
        
        # Convert to canvas items
        canvas_data = convert_sheet_to_canvas_items(sheet_data, sheet_id)
        
        return JSONResponse(content={
            "success": True,
            "data": canvas_data,
            "message": f"Successfully imported {len(canvas_data['items'])} items from sheet '{canvas_data['globalTitle']}'"
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in sheets sync: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@app.post("/sync-to-sheets")
async def sync_canvas_to_sheets(request: CanvasToSheetSyncRequest):
    """
    Sync canvas state to Google Sheets.
    
    Args:
        request: Contains canvas_state and sheet_id
        
    Returns:
        Sync result status
    """
    try:
        sheet_name_info = f" (sheet: {request.sheet_name})" if request.sheet_name else ""
        print(f"[SYNC] Syncing canvas to sheet: {request.sheet_id}{sheet_name_info}")
        
        # Call the sync function with sheet name
        result = sync_canvas_to_sheet(request.sheet_id, request.canvas_state, request.sheet_name)
        
        if result.get("success"):
            return JSONResponse(content={
                "success": True,
                "message": result.get("message"),
                "items_synced": result.get("items_synced", 0)
            })
        else:
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Failed to sync canvas to sheets")
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in canvas-to-sheets sync: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@app.post("/sheets/list")
async def list_sheet_names(request: SheetSyncRequest):
    """
    List available sheet names in a Google Spreadsheet.
    
    Args:
        request: Contains sheet_id
        
    Returns:
        List of available sheet names
    """
    try:
        print(f"Listing sheets in: {request.sheet_id}")
        
        # Get sheet names using Composio
        sheet_names = get_sheet_names(request.sheet_id)
        if not sheet_names:
            raise HTTPException(
                status_code=400, 
                detail="Failed to get sheet names. Please check the sheet ID and ensure it's accessible."
            )
        
        return JSONResponse(content={
            "success": True,
            "sheet_names": sheet_names,
            "count": len(sheet_names)
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in sheet listing: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@app.post("/sheets/create")
async def create_sheet(request: CreateSheetRequest):
    """
    Create a new Google Sheet.
    
    Args:
        request: Contains title for the new sheet
        
    Returns:
        New sheet details including sheet_id and URL
    """
    try:
        print(f"Creating new sheet with title: {request.title}")
        
        # Create new sheet using Composio
        result = create_new_sheet(request.title)
        if not result.get("success"):
            raise HTTPException(
                status_code=400, 
                detail=result.get("error", "Failed to create new sheet")
            )
        
        return JSONResponse(content={
            "success": True,
            "sheet_id": result.get("sheet_id"),
            "sheet_url": result.get("sheet_url"),
            "title": result.get("title"),
            "message": f"Successfully created new sheet '{request.title}'"
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating sheet: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

# Sales pitch endpoints
@app.post("/pitch/initialize")
async def initialize_pitch(request: InitializePitchRequest):
    """Initialize a sales pitch conversation."""
    try:
        logger.info(f"Initializing pitch for conversation: {request.conversation_id}")
        metrics["total_pitches"] += 1
        
        company_info = CompanyInfo(**request.company_info)
        result = sales_pitch_agent.initialize_conversation(
            request.conversation_id, 
            company_info
        )
        
        logger.info(f"Pitch initialized successfully: {request.conversation_id}")
        return JSONResponse(content={
            "success": True,
            "message": result,
            "conversation_id": request.conversation_id,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error initializing pitch: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        metrics["failed_pitches"] += 1
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initialize pitch: {str(e)}"
        )

@app.post("/pitch/evaluate")
async def evaluate_pitch(request: EvaluatePitchRequest):
    """Evaluate a sales pitch message."""
    try:
        logger.info(f"Evaluating pitch message for conversation: {request.conversation_id}")
        
        response = sales_pitch_agent.chat(
            request.conversation_id,
            request.message
        )
        status = sales_pitch_agent.get_conversation_status(request.conversation_id)
        
        # Track successful evaluations
        if status.get("is_passing", False):
            metrics["successful_pitches"] += 1
            logger.info(f"Pitch passed criteria: {request.conversation_id}")
        
        logger.info(f"Pitch evaluation completed: {request.conversation_id}")
        return JSONResponse(content={
            "success": True,
            "response": response,
            "status": status,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error evaluating pitch: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to evaluate pitch: {str(e)}"
        )

@app.post("/pitch/status")
async def get_pitch_status(request: GetPitchStatusRequest):
    """Get the current status of a pitch conversation."""
    try:
        status = sales_pitch_agent.get_conversation_status(request.conversation_id)
        return JSONResponse(content={
            "success": True,
            "status": status
        })
    except Exception as e:
        print(f"Error getting pitch status: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get pitch status: {str(e)}"
        )

@app.post("/pitch/send-email")
async def send_pitch_email(request: SendEmailRequest):
    """Send follow-up email after successful pitch using Composio."""
    try:
        print(f"Sending email to {request.to_email}")
        print(f"Subject: {request.subject}")
        print(f"Company: {request.company_name}")
        
        # Use Composio to send email via Gmail
        try:
            from composio import Composio
            
            composio = Composio()
            
            # Send email using Gmail action
            result = composio.actions.execute(
                action="GMAIL_CREATE_EMAIL_DRAFT",
                params={
                    "to": request.to_email,
                    "subject": request.subject,
                    "body": request.body,
                    "is_html": False
                },
                user_id="default"
            )
            
            if result.get("success"):
                return JSONResponse(content={
                    "success": True,
                    "message": f"Email draft created successfully for {request.to_email}",
                    "draft_id": result.get("draft_id")
                })
            else:
                raise Exception(f"Composio error: {result.get('error', 'Unknown error')}")
                
        except ImportError:
            # Fallback if Composio is not installed
            print("Composio not available, simulating email send")
            return JSONResponse(content={
                "success": True,
                "message": f"Email sent successfully to {request.to_email} (simulated)"
            })
        
    except Exception as e:
        print(f"Error sending email: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send email: {str(e)}"
        )
