"""
Notification service — sends email (SMTP) and SMS (Twilio) alerts.
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from config import settings

logger = logging.getLogger(__name__)


def send_email(subject: str, body_html: str, body_text: str) -> bool:
    if not settings.SMTP_USER or not settings.NOTIFY_EMAIL:
        logger.info("Email not configured — skipping email notification")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_USER
        msg["To"] = settings.NOTIFY_EMAIL

        msg.attach(MIMEText(body_text, "plain"))
        msg.attach(MIMEText(body_html, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, settings.NOTIFY_EMAIL, msg.as_string())
        logger.info(f"Email sent: {subject}")
        return True
    except Exception as e:
        logger.error(f"Email send failed: {e}")
        return False


def send_sms(message: str) -> bool:
    if not settings.TWILIO_ACCOUNT_SID or not settings.NOTIFY_PHONE:
        logger.info("Twilio not configured — skipping SMS notification")
        return False
    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        client.messages.create(
            body=message[:1600],
            from_=settings.TWILIO_FROM_NUMBER,
            to=settings.NOTIFY_PHONE,
        )
        logger.info(f"SMS sent to {settings.NOTIFY_PHONE}")
        return True
    except Exception as e:
        logger.error(f"SMS send failed: {e}")
        return False


def build_alert_email(alert: dict) -> tuple[str, str, str]:
    """Build subject, HTML body, and plain text body for an alert."""
    ticker = alert.get("ticker", "?")
    alert_type = alert.get("alert_type", "ALERT")
    current_price = alert.get("current_price", 0)
    entry_price = alert.get("entry_price", 0)
    stop = alert.get("stop_level")
    target1 = alert.get("profit_target_1")
    target2 = alert.get("profit_target_2")
    reasoning = alert.get("reasoning", "")
    trade_type = alert.get("trade_type", "stock").upper()
    ts = alert.get("timestamp", "")

    urgency_colors = {
        "STOP_LOSS_HIT": "#FF4444",
        "TAKE_PROFIT": "#00C851",
        "EXIT_TRADE": "#FF8800",
        "TREND_REVERSAL": "#FF8800",
        "REDUCE_POSITION": "#FFCC00",
        "ADD_POSITION": "#33B5E5",
        "TRAILING_STOP_UPDATE": "#AA66CC",
        "ENTRY_CONFIRMATION": "#00C851",
    }
    color = urgency_colors.get(alert_type, "#888888")

    subject = f"[TradeMonitor] {alert_type} — {ticker} @ ${current_price:.2f}"

    html = f"""
    <html><body style="font-family: Arial, sans-serif; background: #0d1117; color: #e6edf3; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; border: 2px solid {color}; border-radius: 8px; padding: 20px;">
        <h2 style="color: {color}; margin-top: 0;">{alert_type.replace('_', ' ')}</h2>
        <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 6px; color: #aaa;">Ticker</td><td style="padding: 6px; font-weight: bold;">{ticker} ({trade_type})</td></tr>
            <tr style="background:#161b22;"><td style="padding: 6px; color: #aaa;">Current Price</td><td style="padding: 6px; font-size: 18px; font-weight: bold; color: {color};">${current_price:.2f}</td></tr>
            <tr><td style="padding: 6px; color: #aaa;">Entry Price</td><td style="padding: 6px;">${entry_price:.2f}</td></tr>
            <tr style="background:#161b22;"><td style="padding: 6px; color: #aaa;">Stop Level</td><td style="padding: 6px; color: #FF4444;">${stop:.2f if stop else 'N/A'}</td></tr>
            <tr><td style="padding: 6px; color: #aaa;">Target 1</td><td style="padding: 6px; color: #00C851;">${target1:.2f if target1 else 'N/A'}</td></tr>
            <tr style="background:#161b22;"><td style="padding: 6px; color: #aaa;">Target 2</td><td style="padding: 6px; color: #00C851;">${target2:.2f if target2 else 'N/A'}</td></tr>
            <tr><td style="padding: 6px; color: #aaa;">Timestamp</td><td style="padding: 6px;">{ts}</td></tr>
        </table>
        <div style="margin-top: 16px; padding: 14px; background: #161b22; border-left: 3px solid {color}; border-radius: 4px;">
            <strong style="color: {color};">Reasoning:</strong>
            <p style="margin: 8px 0 0 0; line-height: 1.6;">{reasoning}</p>
        </div>
        <p style="color: #555; font-size: 11px; margin-top: 16px;">Trade Monitor — Institutional Trade Management System</p>
    </div></body></html>
    """

    text = (
        f"TRADE MONITOR ALERT: {alert_type}\n"
        f"{'=' * 50}\n"
        f"Ticker: {ticker} ({trade_type})\n"
        f"Current Price: ${current_price:.2f}\n"
        f"Entry Price: ${entry_price:.2f}\n"
        f"Stop Level: ${stop:.2f if stop else 'N/A'}\n"
        f"Target 1: ${target1:.2f if target1 else 'N/A'}\n"
        f"Target 2: ${target2:.2f if target2 else 'N/A'}\n"
        f"Time: {ts}\n\n"
        f"REASONING:\n{reasoning}\n"
    )

    return subject, html, text


def build_sms_message(alert: dict) -> str:
    """Build concise SMS message (under 160 chars)."""
    ticker = alert.get("ticker", "?")
    alert_type = alert.get("alert_type", "ALERT")
    price = alert.get("current_price", 0)
    stop = alert.get("stop_level")
    short_type = {
        "STOP_LOSS_HIT": "🛑 STOP HIT",
        "TAKE_PROFIT": "✅ TAKE PROFIT",
        "EXIT_TRADE": "⚠️ EXIT",
        "TREND_REVERSAL": "🔄 REVERSAL",
        "REDUCE_POSITION": "⬇️ REDUCE",
        "ADD_POSITION": "⬆️ ADD",
        "TRAILING_STOP_UPDATE": "📍 TRAIL UPDATE",
        "ENTRY_CONFIRMATION": "✅ ENTRY CONFIRMED",
    }.get(alert_type, alert_type)

    msg = f"TradeMonitor {short_type} {ticker} @${price:.2f}"
    if stop:
        msg += f" Stop:${stop:.2f}"
    return msg


async def notify_alert(alert: dict) -> dict:
    """Send email + SMS for an alert. Returns {email: bool, sms: bool}."""
    if not settings.ENABLE_NOTIFICATIONS:
        return {"email": False, "sms": False}

    subject, html, text = build_alert_email(alert)
    sms_msg = build_sms_message(alert)

    email_ok = send_email(subject, html, text)
    sms_ok = send_sms(sms_msg)

    return {"email": email_ok, "sms": sms_ok}
