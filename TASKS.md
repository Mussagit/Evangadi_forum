# AI-Powered Evangadi Forum - Task Tracker

A consolidated milestone-by-milestone checklist of all backend and frontend tasks for the AI-Powered Evangadi Forum.

---

## Milestone 1: Authentication & Public Access

### Backend
- [x] **`T-04` Register User**: `POST /api/auth/register` (Validation, bcrypt password hashing, MySQL user creation).
- [x] **`T-05` Login User**: `POST /api/auth/login` (Credential verification, JWT token issuance).

### Frontend
- [x] **`T-00` Public Landing Page (`/`)**: Hero section, Course RAG explanation, workflow, and Framer Motion animations.
- [x] **`T-06` Axios + Auth Service**: Centralized API client, JWT token attachment, 401 interceptors.
- [x] **`T-07` Auth Page UI (`/auth`)**: Split-screen branding, animated login/register form toggle, password visibility switch.
- [x] **`T-08` AuthContext & ProtectedRoute**: Global auth state management, persistent sessions, route guards.

---

## Milestone 2: Questions & Community Discussions

### Backend
- [x] **`T-09` Create Question & Auto-Embed**: `POST /api/questions` (Generates vector embeddings for semantic search).
- [x] **`T-10` List Questions**: `GET /api/questions` (Supports keyword search and `?mine=true` filter).
- [x] **`T-10` Get Single Question Details**: `GET /api/questions/:questionHash` (Fetches question and associated replies).
- [x] **`T-11` Semantic Search Questions**: `GET /api/questions/search` (AI cosine similarity matching).
- [x] **`T-11` Find Similar Questions**: `GET /api/questions/:questionHash/similar` (Related thread recommendations).
- [x] **`T-12` Create Answer**: `POST /api/answers` (Community replies, prevents author self-answering).
- [x] **`T-17` AI Question Draft Coach**: `POST /api/questions/draft-coach` (Real-time actionable writing tips).
- [x] **`T-18` AI Answer Fit Evaluation**: `POST /api/questions/:questionHash/answer-fit` (Relevance assessment).

### Frontend
- [x] **`T-13` Layout Shell**: Responsive Navbar, Sidebar, fixed/sticky navigation, search bar.
- [x] **`T-14` Dashboard Page (`/dashboard`)**: Welcome banner, shortcuts, metrics stats, live feed, keyword & semantic search.
- [x] **`T-15` Post Question Page (`/questions/ask`)**: Form guidelines card, Markdown toolbar, AI Draft Coach ideas panel, "Thread published" success state.
- [x] **`T-16 & T-20` Question Detail Page (`/questions/:questionHash`)**: 2-column view, rich Markdown code blocks with copy buttons, Related Questions sidebar, answer list, and AI Answer Fit evaluation.
- [x] **`T-21` My Questions Page (`/my-questions`)**: Filtered user questions list with "Yours" highlight badges.

---

## Milestone 3: Knowledge Base (RAG)

### Backend
- [x] **`T-22` Upload & Process RAG Document**: `POST /api/rag/documents` (PDF upload, text parsing, chunking, embeddings).
- [x] **`T-23` Semantic Search in Document**: `GET /api/rag/documents/:documentId/search` (Excerpt retrieval with similarity score).
- [x] **`T-23` AI Query Grounded in Document**: `POST /api/rag/documents/:documentId/query` (Context-grounded AI generation with citations).
- [x] **`T-24` Get Document Metadata**: `GET /api/rag/documents/:documentId` (Processing status & metadata).
- [x] **`T-24` Stream Document PDF**: `GET /api/rag/documents/:documentId/file` (Serves PDF stream for browser preview).
- [x] **`T-24` List User Documents**: `GET /api/rag/documents` (Private user library).
- [x] **`T-24` Delete Document**: `DELETE /api/rag/documents/:documentId` (File cleanup & vector cascade deletion).

### Frontend
- [x] **`T-24 & T-25` Knowledge Base Page (`/rag-documents`)**: 
  - Left column: Library card with PDF upload dropzone, status badges (`READY`, `PROCESSING`, `FAILED`), and delete action.
  - Right column: Unified view featuring **Reader** (inline iframe preview), **Semantic Search** (query input + match scores), and **Ask with AI** (grounded answer generation + code snippet support).
