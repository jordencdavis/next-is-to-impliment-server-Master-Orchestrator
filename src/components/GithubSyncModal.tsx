import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  FolderGit2, 
  Upload, 
  Download, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  ExternalLink, 
  Key, 
  FileCode, 
  GitBranch, 
  Folder, 
  Sparkles,
  Database,
  Lock,
  Loader2
} from 'lucide-react';
import { CanvasBoard, OrganizerItem } from '../types/orchestrator';

interface GithubSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectName: string;
  boards: CanvasBoard[];
  organizerItems: OrganizerItem[];
  onLoadProjectFromGithub: (incoming: {
    name: string;
    boards: CanvasBoard[];
    organizerItems: OrganizerItem[];
    activeBoardId?: string;
  }) => void;
}

interface RepoFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir';
  html_url: string;
  download_url: string | null;
}

export const GithubSyncModal: React.FC<GithubSyncModalProps> = ({
  isOpen,
  onClose,
  currentProjectName,
  boards,
  organizerItems,
  onLoadProjectFromGithub,
}) => {
  // Connection states (persisted in localStorage)
  const [token, setToken] = useState<string>(() => localStorage.getItem('mo_github_token') || '');
  const [repo, setRepo] = useState<string>(() => localStorage.getItem('mo_github_repo') || '');
  const [branch, setBranch] = useState<string>(() => localStorage.getItem('mo_github_branch') || 'main');
  const [filePath, setFilePath] = useState<string>('orchestrator-workspace.json');

  // UI state
  const [activeTab, setActiveTab] = useState<'upload' | 'download' | 'settings'>('upload');
  const [commitMessage, setCommitMessage] = useState(`Sync ${currentProjectName} workspace`);
  
  // Status states
  const [isTesting, setIsTesting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string; url?: string } | null>(null);

  // Repo file browser states
  const [repoFiles, setRepoFiles] = useState<RepoFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [selectedRemoteFile, setSelectedRemoteFile] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('mo_github_token', token);
  }, [token]);

  useEffect(() => {
    localStorage.setItem('mo_github_repo', repo);
  }, [repo]);

  useEffect(() => {
    localStorage.setItem('mo_github_branch', branch);
  }, [branch]);

  useEffect(() => {
    if (isOpen && currentProjectName) {
      setCommitMessage(`Sync ${currentProjectName} workspace`);
      const defaultFileName = `${currentProjectName.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}-workspace.json`;
      setFilePath(defaultFileName);
    }
  }, [isOpen, currentProjectName]);

  const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');

  // Helper to fetch headers for GitHub API
  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };
    if (token.trim()) {
      headers['Authorization'] = `token ${token.trim()}`;
    }
    return headers;
  }, [token]);

  // Test connection to GitHub Repo
  const handleTestConnection = async () => {
    if (!cleanRepo || !cleanRepo.includes('/')) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid GitHub repository in owner/repository format (e.g. octocat/Hello-World).' });
      return;
    }

    setIsTesting(true);
    setStatusMsg(null);

    try {
      const res = await fetch(`https://api.github.com/repos/${cleanRepo}`, {
        headers: getHeaders(),
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Repository not found or private. Ensure owner/repo is correct and Token has repo scope.');
        } else if (res.status === 401) {
          throw new Error('Invalid GitHub Token. Check your Personal Access Token.');
        } else {
          throw new Error(`GitHub API HTTP ${res.status}: ${res.statusText}`);
        }
      }

      const data = await res.json();
      setStatusMsg({
        type: 'success',
        text: `Successfully connected to GitHub repository "${data.full_name}" (${data.private ? 'Private' : 'Public'})!`,
        url: data.html_url,
      });

      // Fetch repo files
      fetchRepoContents();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Connection test failed.' });
    } finally {
      setIsTesting(false);
    }
  };

  // Fetch file list in repository root
  const fetchRepoContents = useCallback(async () => {
    if (!cleanRepo || !cleanRepo.includes('/')) return;
    setIsLoadingFiles(true);

    try {
      const res = await fetch(`https://api.github.com/repos/${cleanRepo}/contents?ref=${branch.trim() || 'main'}`, {
        headers: getHeaders(),
      });

      if (res.ok) {
        const files: RepoFile[] = await res.json();
        if (Array.isArray(files)) {
          setRepoFiles(files);
          const jsonFile = files.find((f) => f.name.endsWith('.json'));
          if (jsonFile) setSelectedRemoteFile(jsonFile.name);
        }
      }
    } catch (err) {
      console.error('Failed to load repo files', err);
    } finally {
      setIsLoadingFiles(false);
    }
  }, [cleanRepo, branch, getHeaders]);

  useEffect(() => {
    if (isOpen && cleanRepo.includes('/')) {
      fetchRepoContents();
    }
  }, [isOpen, cleanRepo, fetchRepoContents]);

  // Upload / Push workspace code and JSON to GitHub
  const handleUploadToGithub = async () => {
    if (!cleanRepo || !cleanRepo.includes('/')) {
      setStatusMsg({ type: 'error', text: 'Please configure repository (owner/repo) first.' });
      return;
    }
    if (!token.trim()) {
      setStatusMsg({ type: 'error', text: 'GitHub Personal Access Token is required to upload files.' });
      setActiveTab('settings');
      return;
    }

    setIsUploading(true);
    setStatusMsg(null);

    const targetPath = (filePath.trim() || 'workspace.json').replace(/^\/+/, '');

    try {
      // 1. Check if file already exists on GitHub to obtain its SHA (required for updating)
      let existingSha: string | undefined = undefined;
      const getFileRes = await fetch(
        `https://api.github.com/repos/${cleanRepo}/contents/${targetPath}?ref=${branch.trim() || 'main'}`,
        { headers: getHeaders() }
      );

      if (getFileRes.ok) {
        const fileInfo = await getFileRes.json();
        existingSha = fileInfo.sha;
      }

      // 2. Prepare payload
      const workspacePayload = {
        projectName: currentProjectName,
        boards,
        organizerItems,
        syncedAt: new Date().toISOString(),
        version: '1.0.0',
      };

      const jsonString = JSON.stringify(workspacePayload, null, 2);
      // UTF-8 base64 encoding
      const encodedContent = btoa(
        encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g, (_, p1) =>
          String.fromCharCode(parseInt(p1, 16))
        )
      );

      const body: any = {
        message: commitMessage.trim() || `Sync ${currentProjectName}`,
        content: encodedContent,
        branch: branch.trim() || 'main',
      };
      if (existingSha) {
        body.sha = existingSha;
      }

      // 3. Put content to GitHub API
      const putRes = await fetch(`https://api.github.com/repos/${cleanRepo}/contents/${targetPath}`, {
        method: 'PUT',
        headers: {
          ...getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!putRes.ok) {
        const errJson = await putRes.json().catch(() => ({}));
        throw new Error(errJson.message || `Upload failed with status ${putRes.status}`);
      }

      const result = await putRes.json();
      setStatusMsg({
        type: 'success',
        text: `Workspace successfully uploaded & committed to GitHub as "${targetPath}"!`,
        url: result.content?.html_url || `https://github.com/${cleanRepo}`,
      });

      // Refresh file list
      fetchRepoContents();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Upload to GitHub failed.' });
    } finally {
      setIsUploading(false);
    }
  };

  // Download / Pull file from GitHub into Workspace
  const handleDownloadFromGithub = async (targetFileName?: string) => {
    const fileToPull = targetFileName || selectedRemoteFile || filePath;
    if (!cleanRepo || !cleanRepo.includes('/')) {
      setStatusMsg({ type: 'error', text: 'Please configure repository (owner/repo) first.' });
      return;
    }
    if (!fileToPull) {
      setStatusMsg({ type: 'error', text: 'Please select a file to download/pull.' });
      return;
    }

    setIsDownloading(true);
    setStatusMsg(null);

    const targetPath = fileToPull.replace(/^\/+/, '');

    try {
      const res = await fetch(
        `https://api.github.com/repos/${cleanRepo}/contents/${targetPath}?ref=${branch.trim() || 'main'}`,
        { headers: getHeaders() }
      );

      if (!res.ok) {
        throw new Error(`File "${targetPath}" not found in repository or permission denied.`);
      }

      const fileData = await res.json();
      if (!fileData.content) {
        throw new Error('File content is empty or binary directory.');
      }

      // Base64 decode content safely
      const cleanContent = fileData.content.replace(/\s/g, '');
      const decodedString = decodeURIComponent(
        Array.prototype.map
          .call(atob(cleanContent), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      const parsed = JSON.parse(decodedString);
      const incomingProject = {
        name: parsed.projectName || parsed.name || targetPath.replace(/\.json$/i, ''),
        boards: parsed.boards || [],
        organizerItems: parsed.organizerItems || [],
        activeBoardId: parsed.boards?.[0]?.id,
      };

      onLoadProjectFromGithub(incomingProject);
      setStatusMsg({
        type: 'success',
        text: `Successfully downloaded & imported "${targetPath}" into live canvas workspace!`,
        url: fileData.html_url,
      });

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to download file from GitHub.' });
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div 
        className="w-full max-w-xl bg-[#F8EBE8] dark:bg-[#1A331C] border-2 border-[#709654] dark:border-[#3B5D37] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[#1F3E22] dark:text-[#F8EBE8]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#709654] text-[#F8EBE8] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#1F3E22]/30 text-[#F8EBE8] border border-white/20">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                <span>Sync with GitHub</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-mono">
                  Git Sync
                </span>
              </h3>
              <p className="text-[11px] text-[#F8EBE8]/80 leading-tight">
                Upload & download canvas boards, code, and project files with GitHub repositories
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-black/20 text-[#F8EBE8] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-2 bg-[#EEDFD8] dark:bg-[#152816] border-b border-[#709654]/30 shrink-0 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white dark:bg-[#1F3E22] text-[#871201] dark:text-[#DF9C56] shadow-xs font-bold'
                : 'text-[#709654] dark:text-[#AFD1C2] hover:bg-white/50'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload / Push</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('download');
              fetchRepoContents();
            }}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'download'
                ? 'bg-white dark:bg-[#1F3E22] text-[#871201] dark:text-[#DF9C56] shadow-xs font-bold'
                : 'text-[#709654] dark:text-[#AFD1C2] hover:bg-white/50'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download / Pull</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-white dark:bg-[#1F3E22] text-[#871201] dark:text-[#DF9C56] shadow-xs font-bold'
                : 'text-[#709654] dark:text-[#AFD1C2] hover:bg-white/50'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Token & Repo Settings</span>
          </button>
        </div>

        {/* Status Notification Banner */}
        {statusMsg && (
          <div className={`px-4 py-2.5 text-xs font-medium border-b flex items-start justify-between gap-2 shrink-0 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
              : statusMsg.type === 'error'
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-800 dark:text-rose-200'
              : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-800 dark:text-indigo-200'
          }`}>
            <div className="flex items-start gap-2 min-w-0">
              {statusMsg.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <span>{statusMsg.text}</span>
                {statusMsg.url && (
                  <a
                    href={statusMsg.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 font-bold underline inline-flex items-center gap-1 hover:opacity-80"
                  >
                    <span>View on GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
            <button
              onClick={() => setStatusMsg(null)}
              className="p-0.5 hover:opacity-70 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* TAB 1: UPLOAD / PUSH */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#EEDFD8] dark:bg-[#152816] rounded-xl border border-[#709654]/30 space-y-2">
                <div className="flex items-center justify-between font-bold text-[#1F3E22] dark:text-[#F8EBE8]">
                  <span className="flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-[#709654]" />
                    <span>Workspace Data to Upload:</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/5 dark:bg-white/10">
                    {boards.length} boards · {organizerItems.length} items
                  </span>
                </div>
                <div className="text-[11px] text-[#709654] dark:text-[#AFD1C2] leading-relaxed">
                  Project <span className="font-bold text-[#1F3E22] dark:text-[#F8EBE8]">&quot;{currentProjectName}&quot;</span> including all visual board nodes, connectors, and organizer items will be encoded and pushed to GitHub repository <span className="font-mono font-semibold text-[#871201] dark:text-[#DF9C56]">{cleanRepo || '(not configured)'}</span>.
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#1F3E22] dark:text-[#F8EBE8] block mb-1">
                  Target Repository Path
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-mono text-[11px] shrink-0">
                    {cleanRepo || 'owner/repo'}/
                  </span>
                  <input
                    type="text"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    placeholder="orchestrator-workspace.json"
                    className="flex-1 px-3 py-2 bg-[#EEDFD8] dark:bg-[#182E1A] border border-[#709654]/30 rounded-lg text-[#1F3E22] dark:text-[#F8EBE8] font-mono focus:outline-none focus:border-[#DF9C56]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#1F3E22] dark:text-[#F8EBE8] block mb-1">
                  Commit Message
                </label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="e.g. Sync Master Orchestrator project and canvas state"
                  className="w-full px-3 py-2 bg-[#EEDFD8] dark:bg-[#182E1A] border border-[#709654]/30 rounded-lg text-[#1F3E22] dark:text-[#F8EBE8] focus:outline-none focus:border-[#DF9C56]"
                />
              </div>

              {!cleanRepo || !token ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 rounded-xl text-[11px]">
                  ⚠️ GitHub Repository or Token not configured. Go to <button onClick={() => setActiveTab('settings')} className="underline font-bold">Token & Repo Settings</button> to configure your connection.
                </div>
              ) : null}

              <button
                onClick={handleUploadToGithub}
                disabled={isUploading || !cleanRepo || !token}
                className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
                  isUploading || !cleanRepo || !token
                    ? 'bg-gray-300 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-[#3B5D37] hover:bg-[#1F3E22] text-white shadow-md active:scale-98'
                }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Pushing & Committing to GitHub...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Push Workspace to GitHub ({branch})</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 2: DOWNLOAD / PULL */}
          {activeTab === 'download' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-[#1F3E22] dark:text-[#F8EBE8] flex items-center gap-1.5">
                  <Folder className="w-4 h-4 text-[#709654]" />
                  <span>Files in GitHub Repository ({cleanRepo || 'not configured'}):</span>
                </label>
                <button
                  onClick={fetchRepoContents}
                  disabled={isLoadingFiles}
                  className="text-[10px] text-[#3B5D37] dark:text-[#AFD1C2] hover:underline flex items-center gap-1 cursor-pointer font-bold"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                  <span>Refresh List</span>
                </button>
              </div>

              {/* Repo File Explorer */}
              <div className="bg-[#EEDFD8] dark:bg-[#182E1A] border border-[#709654]/30 rounded-xl p-2 max-h-52 overflow-y-auto space-y-1">
                {isLoadingFiles ? (
                  <div className="py-6 text-center text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading repository files...</span>
                  </div>
                ) : repoFiles.length > 0 ? (
                  repoFiles
                    .filter((f) => f.type === 'file')
                    .map((file) => {
                      const isSelected = selectedRemoteFile === file.name;
                      return (
                        <div
                          key={file.sha}
                          onClick={() => setSelectedRemoteFile(file.name)}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                            isSelected
                              ? 'bg-[#3B5D37] text-white font-bold shadow-2xs'
                              : 'hover:bg-white/60 dark:hover:bg-black/30 text-[#1F3E22] dark:text-[#F8EBE8]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileCode className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-[#709654]'}`} />
                            <span className="truncate font-mono text-[11px]">{file.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] opacity-70 font-mono">
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadFromGithub(file.name);
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-white text-[#1F3E22] hover:bg-slate-100'
                                  : 'bg-[#709654]/20 hover:bg-[#709654] text-[#1F3E22] dark:text-[#F8EBE8] hover:text-white'
                              }`}
                              title="Download and import this file into workspace canvas"
                            >
                              Pull File
                            </button>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="py-6 text-center text-slate-400 italic text-xs">
                    No JSON or code files found in repository root. Ensure owner/repo is set correctly.
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#1F3E22] dark:text-[#F8EBE8] block mb-1">
                  Or Specify File Path to Pull:
                </label>
                <input
                  type="text"
                  value={selectedRemoteFile}
                  onChange={(e) => setSelectedRemoteFile(e.target.value)}
                  placeholder="orchestrator-workspace.json"
                  className="w-full px-3 py-2 bg-[#EEDFD8] dark:bg-[#182E1A] border border-[#709654]/30 rounded-lg text-[#1F3E22] dark:text-[#F8EBE8] font-mono focus:outline-none focus:border-[#DF9C56]"
                />
              </div>

              <button
                onClick={() => handleDownloadFromGithub()}
                disabled={isDownloading || !selectedRemoteFile || !cleanRepo}
                className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
                  isDownloading || !selectedRemoteFile || !cleanRepo
                    ? 'bg-gray-300 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-[#871201] hover:bg-[#A81702] text-white shadow-md active:scale-98'
                }`}
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Pulling File from GitHub...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Pull & Load into Canvas Workspace</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 3: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-[#1F3E22] dark:text-[#F8EBE8] block mb-1">
                  GitHub Personal Access Token (PAT) *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 bg-[#EEDFD8] dark:bg-[#182E1A] border border-[#709654]/30 rounded-lg text-[#1F3E22] dark:text-[#F8EBE8] font-mono focus:outline-none focus:border-[#DF9C56]"
                  />
                </div>
                <p className="text-[10px] text-[#709654] dark:text-[#AFD1C2] mt-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#3B5D37]" />
                  <span>Token is stored locally in your browser session. Requires <code className="font-mono bg-black/10 px-1 rounded">repo</code> scope for private repos.</span>
                </p>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#1F3E22] dark:text-[#F8EBE8] block mb-1">
                  GitHub Repository (owner/repo) *
                </label>
                <input
                  type="text"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="e.g. octocat/Hello-World or my-org/my-project"
                  className="w-full px-3 py-2 bg-[#EEDFD8] dark:bg-[#182E1A] border border-[#709654]/30 rounded-lg text-[#1F3E22] dark:text-[#F8EBE8] font-mono focus:outline-none focus:border-[#DF9C56]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#1F3E22] dark:text-[#F8EBE8] block mb-1">
                  Branch Name
                </label>
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-[#709654]" />
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main"
                    className="flex-1 px-3 py-2 bg-[#EEDFD8] dark:bg-[#182E1A] border border-[#709654]/30 rounded-lg text-[#1F3E22] dark:text-[#F8EBE8] font-mono focus:outline-none focus:border-[#DF9C56]"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#709654]/20 flex justify-between items-center">
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo&description=MasterOrchestratorCanvasSync"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[#3B5D37] dark:text-[#AFD1C2] hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Generate New GitHub PAT Token</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting || !cleanRepo}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    isTesting || !cleanRepo
                      ? 'bg-gray-300 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
                      : 'bg-[#709654] hover:bg-[#3B5D37] text-white'
                  }`}
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Test GitHub Connection</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#EEDFD8] dark:bg-[#152816] border-t border-[#709654]/25 flex items-center justify-between text-xs shrink-0">
          <div className="text-[11px] text-[#709654] dark:text-[#AFD1C2] truncate max-w-[280px]">
            {cleanRepo ? `Repo: ${cleanRepo} (${branch})` : 'GitHub not configured'}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 font-semibold text-[#709654] hover:text-[#1F3E22] dark:hover:text-[#F8EBE8] rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
