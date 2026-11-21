"""Domain exceptions raised by repositories and services."""


class NotFoundError(Exception):
    """Raised when a requested record does not exist."""


class DuplicateError(Exception):
    """Raised when creating a record would violate a uniqueness constraint."""


class DomainValidationError(Exception):
    """Raised when a request is structurally valid but breaks a workflow rule."""
