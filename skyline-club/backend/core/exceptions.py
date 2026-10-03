from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """
    Custom exception handler to return consistent JSON error responses across the API.
    Format:
    {
        "status": "error",
        "code": 400,
        "message": "Validation failed or error description",
        "details": { ... }
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        custom_response_data = {
            "status": "error",
            "code": response.status_code,
            "message": "An error occurred while processing your request.",
            "details": response.data,
        }

        # If detail string exists in standard DRF error response
        if isinstance(response.data, dict) and "detail" in response.data:
            custom_response_data["message"] = str(response.data["detail"])

        return Response(custom_response_data, status=response.status_code)

    return Response(
        {
            "status": "error",
            "code": status.HTTP_500_INTERNAL_SERVER_ERROR,
            "message": "Internal server error",
            "details": str(exc),
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
