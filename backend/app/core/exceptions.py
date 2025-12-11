"""Custom exception classes for the application."""


class BaseAppException(Exception):
    """Base exception for all application exceptions."""

    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class UnauthorizedException(BaseAppException):
    """Raised when authentication fails."""

    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, status_code=401)


class ForbiddenException(BaseAppException):
    """Raised when user lacks required permissions."""

    def __init__(self, message: str = "Forbidden"):
        super().__init__(message, status_code=403)


class NotFoundException(BaseAppException):
    """Raised when a requested resource is not found."""

    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=404)


class ValidationException(BaseAppException):
    """Raised when input validation fails."""

    def __init__(self, message: str = "Validation error"):
        super().__init__(message, status_code=422)


class AgentBusyException(BaseAppException):
    """Raised when attempting to modify an agent that is currently busy."""

    def __init__(self, message: str = "Agent is currently busy"):
        super().__init__(message, status_code=409)

