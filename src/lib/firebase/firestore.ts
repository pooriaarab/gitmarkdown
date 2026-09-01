import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  addDoc,
  limit,
} from 'firebase/firestore';
import { getClientDb } from './config';
import type { Workspace, FileNode, Comment } from '@/types';

// Workspaces
export async function createWorkspace(data: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>) {
  const ref = doc(collection(getClientDb(), 'workspaces'));
  await setDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  const snap = await getDoc(doc(getClientDb(), 'workspaces', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Workspace;
}

export async function getUserWorkspaces(uid: string): Promise<Workspace[]> {
  const q = query(
    collection(getClientDb(), 'workspaces'),
    where(`members.${uid}.role`, 'in', ['owner', 'editor', 'viewer'])
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Workspace);
}

export async function updateWorkspace(id: string, data: Partial<Workspace>) {
  await updateDoc(doc(getClientDb(), 'workspaces', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// Files
export async function saveFile(workspaceId: string, file: Omit<FileNode, 'id'>) {
  const fileId = file.path.replace(/\//g, '__');
  await setDoc(doc(getClientDb(), 'workspaces', workspaceId, 'files', fileId), {
    ...file,
    updatedAt: serverTimestamp(),
  });
  return fileId;
}

export async function getFile(workspaceId: string, filePath: string): Promise<FileNode | null> {
  const fileId = filePath.replace(/\//g, '__');
  const snap = await getDoc(doc(getClientDb(), 'workspaces', workspaceId, 'files', fileId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as FileNode;
}

export async function getWorkspaceFiles(workspaceId: string): Promise<FileNode[]> {
  const snap = await getDocs(collection(getClientDb(), 'workspaces', workspaceId, 'files'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FileNode);
}

// Comments
export async function addComment(
  workspaceId: string,
  fileId: string,
  comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>
) {
  const ref = await addDoc(
    collection(getClientDb(), 'workspaces', workspaceId, 'files', fileId, 'comments'),
    {
      ...comment,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );
  return ref.id;
}

export async function getComments(workspaceId: string, fileId: string): Promise<Comment[]> {
  const q = query(
    collection(getClientDb(), 'workspaces', workspaceId, 'files', fileId, 'comments'),
    orderBy('createdAt', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Comment);
}

export function subscribeToComments(
  workspaceId: string,
  fileId: string,
  callback: (comments: Comment[]) => void
) {
  const q = query(
    collection(getClientDb(), 'workspaces', workspaceId, 'files', fileId, 'comments'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    const comments = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Comment);
    callback(comments);
  });
}

export async function updateComment(
  workspaceId: string,
  fileId: string,
  commentId: string,
  data: Partial<Comment>
) {
  await updateDoc(
    doc(getClientDb(), 'workspaces', workspaceId, 'files', fileId, 'comments', commentId),
    { ...data, updatedAt: serverTimestamp() }
  );
}

export async function deleteComment(workspaceId: string, fileId: string, commentId: string) {
  await deleteDoc(doc(getClientDb(), 'workspaces', workspaceId, 'files', fileId, 'comments', commentId));
}

// Versions
export async function saveVersion(workspaceId: string, version: { sha: string; message: string; author: string; authorAvatar?: string; date: string; filesChanged: string[] }) {
  await setDoc(doc(getClientDb(), 'workspaces', workspaceId, 'versions', version.sha), version);
}

export async function getVersions(workspaceId: string, maxResults = 50) {
  const q = query(
    collection(getClientDb(), 'workspaces', workspaceId, 'versions'),
    orderBy('date', 'desc'),
    limit(maxResults)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

// ── Flat-collection comment helpers (no workspaceId required) ──────────
// Comments are stored in a top-level "comments" collection, keyed by
// repoFullName (owner/repo) + filePath so the editor page can read/write
// them without resolving a workspace first.

export function subscribeToFileComments(
  owner: string,
  repo: string,
  filePath: string,
  onUpdate: (comments: Comment[]) => void
) {
  const commentsRef = collection(getClientDb(), 'comments');
  const q = query(
    commentsRef,
    where('repoFullName', '==', `${owner}/${repo}`),
    where('filePath', '==', filePath),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: (d.data().createdAt as Timestamp | null)?.toDate() ?? new Date(),
      updatedAt: (d.data().updatedAt as Timestamp | null)?.toDate() ?? new Date(),
    })) as Comment[];
    onUpdate(comments);
  });
}

export async function addFileComment(
  owner: string,
  repo: string,
  filePath: string,
  comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>
) {
  const commentsRef = collection(getClientDb(), 'comments');
  return addDoc(commentsRef, {
    ...comment,
    repoFullName: `${owner}/${repo}`,
    filePath,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateFileComment(
  commentId: string,
  updates: Partial<Comment>
) {
  const commentRef = doc(getClientDb(), 'comments', commentId);
  return updateDoc(commentRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteFileComment(commentId: string) {
  const commentRef = doc(getClientDb(), 'comments', commentId);
  return deleteDoc(commentRef);
}

// ── User Settings (synced across devices) ──────────────────────────────

export async function getUserSettings(uid: string): Promise<Record<string, unknown> | null> {
  const snap = await getDoc(doc(getClientDb(), 'userSettings', uid));
  if (!snap.exists()) return null;
  return snap.data();
}

export async function saveUserSettings(uid: string, settings: Record<string, unknown>) {
  await setDoc(
    doc(getClientDb(), 'userSettings', uid),
    { ...settings, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

// ── AI Chat History ──────────────────────────────────────────────────

export interface AIChat {
  id: string;
  userId: string;
  repoFullName: string;
  title: string;
  messages: string; // JSON-serialized UIMessage[]
  createdAt: Date;
  updatedAt: Date;
}

export async function createAIChat(
  userId: string,
  data: { repoFullName: string; title: string; messages: string }
) {
  const ref = await addDoc(collection(getClientDb(), 'users', userId, 'aiChats'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAIChat(
  userId: string,
  chatId: string,
  data: Partial<{ title: string; messages: string }>
) {
  await updateDoc(doc(getClientDb(), 'users', userId, 'aiChats', chatId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getAIChats(userId: string): Promise<AIChat[]> {
  const q = query(
    collection(getClientDb(), 'users', userId, 'aiChats'),
    orderBy('updatedAt', 'desc'),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      userId,
      repoFullName: data.repoFullName,
      title: data.title,
      messages: data.messages,
      createdAt: (data.createdAt as Timestamp | null)?.toDate() ?? new Date(),
      updatedAt: (data.updatedAt as Timestamp | null)?.toDate() ?? new Date(),
    } as AIChat;
  });
}

export async function deleteAIChat(userId: string, chatId: string) {
  await deleteDoc(doc(getClientDb(), 'users', userId, 'aiChats', chatId));
}

// ── AI Personas ────────────────────────────────────────────────────────────

export interface AIPersonaDoc {
  id: string;
  name: string;
  description: string;
  instructions: string;
  avatar: string;
  createdAt: Date;
}

export async function createPersona(
  userId: string,
  data: { name: string; description: string; instructions: string; avatar: string }
) {
  const ref = await addDoc(collection(getClientDb(), 'users', userId, 'personas'), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getPersonas(userId: string): Promise<AIPersonaDoc[]> {
  const q = query(
    collection(getClientDb(), 'users', userId, 'personas'),
    orderBy('createdAt', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      description: data.description,
      instructions: data.instructions,
      avatar: data.avatar,
      createdAt: (data.createdAt as Timestamp | null)?.toDate() ?? new Date(),
    };
  });
}

export async function updatePersona(
  userId: string,
  personaId: string,
  data: Partial<{ name: string; description: string; instructions: string; avatar: string }>
) {
  await updateDoc(doc(getClientDb(), 'users', userId, 'personas', personaId), data);
}

export async function deletePersona(userId: string, personaId: string) {
  await deleteDoc(doc(getClientDb(), 'users', userId, 'personas', personaId));
}
