import io
import base64
import qrcode


def generate_member_qr_bytes(token: str) -> bytes:
    """
    Generates a PNG byte string of a QR code encoding the member's verification token.
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(str(token))
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


def generate_member_qr_data_url(token: str) -> str:
    """
    Generates a base64 Data URL string of the member verification QR code.
    Format: data:image/png;base64,...
    """
    if not token:
        return ""
    raw_bytes = generate_member_qr_bytes(token)
    encoded = base64.b64encode(raw_bytes).decode('utf-8')
    return f"data:image/png;base64,{encoded}"
