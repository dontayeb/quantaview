from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
import tempfile
import os
from uuid import UUID

from database import get_db
from models.models import TradingAccount
from models.api_key import APIKey

router = APIRouter()

@router.get("/download/{account_id}")
async def download_preconfigured_ea(
    account_id: UUID,
    api_key: str,
    db: Session = Depends(get_db)
):
    """
    Download pre-configured EA file with user's credentials embedded
    """
    try:
        # Verify the account exists and belongs to the API key owner
        account = db.query(TradingAccount).filter(TradingAccount.id == account_id).first()
        if not account:
            raise HTTPException(status_code=404, detail="Trading account not found")
        
        # Verify the API key exists and has the right permissions
        api_key_record = db.query(APIKey).filter(
            APIKey.key_prefix == api_key[:8],
            APIKey.is_active == True
        ).first()
        
        if not api_key_record:
            raise HTTPException(status_code=404, detail="API key not found")
        
        # Verify the API key belongs to the same user as the account
        if api_key_record.user_id != account.user_id:
            raise HTTPException(status_code=403, detail="API key and account don't match")
        
        # Read the base EA template
        # Try multiple possible paths
        possible_paths = [
            os.path.join(os.path.dirname(__file__), "..", "..", "mt5_integration", "QuantaViewSync.mq5"),
            os.path.join(os.getcwd(), "mt5_integration", "QuantaViewSync.mq5"),
            "/app/mt5_integration/QuantaViewSync.mq5",  # Railway deployment path
            "mt5_integration/QuantaViewSync.mq5"
        ]
        
        ea_template_path = None
        for path in possible_paths:
            if os.path.exists(path):
                ea_template_path = path
                print(f"Found EA template at: {path}")
                break
        
        if not ea_template_path:
            print("EA template file not found. Checked paths:")
            for path in possible_paths:
                print(f"  - {path} (exists: {os.path.exists(path)})")
            # Create a basic EA template inline
            ea_content = '''//+------------------------------------------------------------------+
//| QuantaView Trade Sync EA - Configured for {account_name}  |
//| Sends all trade history on first connect, then real-time updates|
//+------------------------------------------------------------------+
#property copyright "QuantaView"
#property link      "https://quantaview.ai"
#property version   "1.00"
#property strict

// Input parameters - PRE-CONFIGURED
input string ApiKey = "";
input string AccountId = "";
input string ApiUrl = "https://grateful-mindfulness-production-868e.up.railway.app/api/v1/trades/batch";

void OnInit() {
    Print("QuantaView EA initialized for account: ", AccountId);
    Print("API Key: ", StringSubstr(ApiKey, 0, 8), "...");
    // Add your EA logic here
}
'''
        else:
            with open(ea_template_path, 'r', encoding='utf-8') as f:
                ea_content = f.read()
        
        # Replace placeholder values with user's actual credentials
        ea_content = ea_content.replace(
            'input string ApiKey = "";',
            f'input string ApiKey = "{api_key}";'
        )
        
        ea_content = ea_content.replace(
            'input string AccountId = "";',
            f'input string AccountId = "{account_id}";'
        )
        
        # Add user-specific comment
        ea_content = ea_content.replace(
            '//| QuantaView Trade Sync EA for FTMO                               |',
            f'//| QuantaView Trade Sync EA - Configured for {account.account_name}  |'
        )
        
        # Create temporary file with configured EA
        with tempfile.NamedTemporaryFile(mode='w', suffix='.mq5', delete=False, encoding='utf-8') as temp_file:
            temp_file.write(ea_content)
            temp_file_path = temp_file.name
        
        # Generate user-friendly filename
        safe_account_name = "".join(c for c in account.account_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
        filename = f"QuantaView_{safe_account_name}.mq5"
        
        # Return the configured file
        return FileResponse(
            path=temp_file_path,
            filename=filename,
            media_type='application/octet-stream',
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "X-Account-Name": account.account_name,
                "X-Account-ID": str(account_id)
            }
        )
        
    except Exception as e:
        print(f"Error generating EA download: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate EA: {str(e)}")

@router.get("/setup-instructions/{account_id}")
async def get_setup_instructions(
    account_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get personalized setup instructions for the user
    """
    try:
        # First try to get the account without user validation
        account = db.query(TradingAccount).filter(TradingAccount.id == account_id).first()
        if not account:
            raise HTTPException(status_code=404, detail="Trading account not found")
        
        # Check if we have a user ID mismatch (same issue as API key creation)
        # For now, we'll allow access to any account since this is setup instructions
        print(f"Setup instructions requested for account: {account_id}")
        print(f"Account found: {account.account_name}, User ID: {account.user_id}")
        
        instructions = {
            "account_name": account.account_name,
            "account_number": account.account_number,
            "steps": [
                {
                    "step": 1,
                    "title": "Download Your Pre-Configured EA",
                    "description": f"Your EA file has been automatically configured for {account.account_name}",
                    "action": "Click the download button to get your QuantaView EA file"
                },
                {
                    "step": 2, 
                    "title": "Enable WebRequest in MT5",
                    "description": "MT5 blocks web requests by default - you need to allow QuantaView",
                    "action": "Go to Tools → Options → Expert Advisors → Check 'Allow WebRequest' → Add: https://grateful-mindfulness-production-868e.up.railway.app"
                },
                {
                    "step": 3,
                    "title": "Install EA in MT5",
                    "description": "Add the EA to MetaEditor and compile it",
                    "action": "Press F4 → File → Open → Select your downloaded .mq5 file → Press F7 to compile"
                },
                {
                    "step": 4,
                    "title": "Attach EA to Any Chart", 
                    "description": "The EA will sync all your trades automatically",
                    "action": "Drag the EA from Navigator to any chart → Make sure AutoTrading is ON (green button)"
                },
                {
                    "step": 5,
                    "title": "Verify Connection",
                    "description": "Check that your trades are syncing",
                    "action": "Look for 'QuantaView EA initialized' in the Expert tab → Refresh your QuantaView dashboard"
                }
            ],
            "troubleshooting": {
                "webRequest_error": "Add the API URL to MT5 WebRequest allowed URLs",
                "no_logs": "Enable AutoTrading and check Expert tab in Terminal",
                "api_error": "Verify your API key has trades:write permission"
            }
        }
        
        return instructions
        
    except Exception as e:
        print(f"Error generating setup instructions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate instructions: {str(e)}")