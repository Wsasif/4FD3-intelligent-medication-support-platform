from pydantic import BaseModel


class DrugOut(BaseModel):
    """One drug in search results (from the DDInter list)."""
    id: int
    name: str