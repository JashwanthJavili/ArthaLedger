from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from app.api.deps import get_current_user
from app.services.firebase_service import get_db_ref
import time

router = APIRouter(prefix='/projects', tags=['projects'])


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field('', max_length=500)


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)


def _projects_ref(uid: str):
    return get_db_ref(f'users/{uid}/projects')


@router.get('/')
async def list_projects(user: dict = Depends(get_current_user)):
    uid = user['uid']
    snap = _projects_ref(uid).get()
    if not snap:
        return []
    return [{'id': k, **v} for k, v in snap.items()]


@router.post('/', status_code=201)
async def create_project(body: ProjectCreate, user: dict = Depends(get_current_user)):
    uid = user['uid']
    now = int(time.time() * 1000)
    new_ref = _projects_ref(uid).push()
    data = {'name': body.name, 'description': body.description or '', 'createdAt': now, 'updatedAt': now}
    new_ref.set(data)
    return {'id': new_ref.key, **data}


@router.get('/{project_id}')
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    uid = user['uid']
    snap = get_db_ref(f'users/{uid}/projects/{project_id}').get()
    if not snap:
        raise HTTPException(status_code=404, detail='Project not found')
    return {'id': project_id, **snap}


@router.patch('/{project_id}')
async def update_project(project_id: str, body: ProjectUpdate, user: dict = Depends(get_current_user)):
    uid = user['uid']
    ref = get_db_ref(f'users/{uid}/projects/{project_id}')
    if not ref.get():
        raise HTTPException(status_code=404, detail='Project not found')
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    updates['updatedAt'] = int(time.time() * 1000)
    ref.update(updates)
    return {'id': project_id, **updates}


@router.delete('/{project_id}', status_code=204)
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    uid = user['uid']
    ref = get_db_ref(f'users/{uid}/projects/{project_id}')
    if not ref.get():
        raise HTTPException(status_code=404, detail='Project not found')
    ref.delete()
