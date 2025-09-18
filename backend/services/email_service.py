"""
Email service using Resend for QuantaView
"""
import os
import logging
from typing import Optional
import resend
from datetime import datetime

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.api_key = os.getenv("RESEND_API_KEY")
        if self.api_key:
            resend.api_key = self.api_key
        else:
            logger.warning("RESEND_API_KEY not found - email service disabled")
    
    def is_configured(self) -> bool:
        """Check if email service is properly configured"""
        return bool(self.api_key)
    
    async def send_verification_email(
        self, 
        email: str, 
        full_name: Optional[str], 
        verification_token: str,
        frontend_url: str = "http://localhost:3000"
    ) -> bool:
        """Send email verification email"""
        if not self.is_configured():
            logger.error("Email service not configured - cannot send verification email")
            return False
        
        try:
            verification_url = f"{frontend_url}/verify-email?token={verification_token}"
            
            subject = "Welcome to QuantaView - Please Verify Your Email"
            
            html_content = self._get_verification_email_html(
                full_name or "User",
                verification_url
            )
            
            text_content = self._get_verification_email_text(
                full_name or "User",
                verification_url
            )
            
            # Send email using Resend
            params = {
                "from": "QuantaView <onboarding@resend.dev>",  # Using Resend's verified domain
                "to": [email],
                "subject": subject,
                "html": html_content,
                "text": text_content,
            }
            
            response = resend.Emails.send(params)
            
            if response.get("id"):
                logger.info(f"Verification email sent to {email}: {response['id']}")
                return True
            else:
                logger.error(f"Failed to send verification email to {email}: {response}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending verification email to {email}: {str(e)}")
            return False
    
    def _get_verification_email_html(self, name: str, verification_url: str) -> str:
        """Get HTML content for verification email"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email - QuantaView</title>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .logo {{ font-size: 24px; font-weight: bold; color: #2563eb; }}
                .content {{ background: #f8fafc; padding: 30px; border-radius: 8px; text-align: center; }}
                .button {{ 
                    display: inline-block; 
                    background: #2563eb; 
                    color: white; 
                    text-decoration: none; 
                    padding: 12px 24px; 
                    border-radius: 6px; 
                    margin: 20px 0;
                    font-weight: 500;
                }}
                .footer {{ text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">QuantaView</div>
                    <p style="color: #6b7280;">AI-Powered Trading Analytics</p>
                </div>
                
                <div class="content">
                    <h1 style="margin: 0 0 20px 0; color: #1f2937;">Welcome to QuantaView!</h1>
                    <p style="margin: 0 0 20px 0; color: #4b5563;">
                        Hi {name},<br><br>
                        Thank you for signing up for QuantaView. To complete your registration and 
                        start analyzing your trading data, please verify your email address.
                    </p>
                    
                    <a href="{verification_url}" class="button">Verify Email Address</a>
                    
                    <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px;">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        <a href="{verification_url}" style="color: #2563eb; word-break: break-all;">{verification_url}</a>
                    </p>
                </div>
                
                <div class="footer">
                    <p>This link will expire in 24 hours.</p>
                    <p>If you didn't create an account with QuantaView, please ignore this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _get_verification_email_text(self, name: str, verification_url: str) -> str:
        """Get plain text content for verification email"""
        return f"""
Welcome to QuantaView!

Hi {name},

Thank you for signing up for QuantaView. To complete your registration and start analyzing your trading data, please verify your email address by clicking the link below:

{verification_url}

This link will expire in 24 hours.

If you didn't create an account with QuantaView, please ignore this email.

---
QuantaView - AI-Powered Trading Analytics
        """.strip()

# Global instance
email_service = EmailService()