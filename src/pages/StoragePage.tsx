import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field, SelectField } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { storageApi } from '@/api/storageApi';
import { FolderOpen } from 'lucide-react';

const MIME_OPTIONS = [
  { label: 'PDF',   value: 'application/pdf' },
  { label: 'JPEG',  value: 'image/jpeg' },
  { label: 'PNG',   value: 'image/png' },
  { label: 'DOCX',  value: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { label: 'XLSX',  value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
];

export default function StoragePage() {
  const [folderName, setFolderName]   = useState('');
  const [folderId, setFolderId]       = useState('');
  const [fileName, setFileName]       = useState('');
  const [fileSize, setFileSize]       = useState('');
  const [mimeType, setMimeType]       = useState('application/pdf');
  const [fileId, setFileId]           = useState('');
  const [page, setPage]               = useState('1');
  const [delFolderId, setDelFolder]   = useState('');

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Document Storage Vault"
        subtitle="Create folders, upload files (simulated), and manage the storage quota granted by your subscription plan."
        icon={<FolderOpen size={18} />}
        badge="Auth Required"
        postmanSection="storage"
      />

      <div className="space-y-4">
        {/* Usage */}
        <ApiCard
          step={1}
          title="Get Storage Usage & Info"
          method="GET"
          endpoint="/api/v1/storage/info"
          description="Returns storage usage, plan details, folder list and quota limits for the logged-in user."
          onSubmit={() => storageApi.getInfo()}
        />

        {/* Create folder */}
        <ApiCard
          step={2}
          title="Create Folder"
          method="POST"
          endpoint="/api/v1/storage/create-folder"
          description="Creates a new folder. The folder limit comes from your subscription plan (maxFolders)."
          onSubmit={() => storageApi.createFolder(folderName)}
        >
          <Field label="Folder Name" value={folderName} onChange={setFolderName} placeholder="e.g. ITR Documents" />
        </ApiCard>

        {/* Upload file */}
        <ApiCard
          step={3}
          title="Upload File (Simulated)"
          method="POST"
          endpoint="/api/v1/storage/upload-file"
          description="Records a file upload. Size enforces storage quota. Note: actual binary upload is a future feature (S3 migration pending)."
          onSubmit={() => storageApi.uploadFile(folderId, fileName, Number(fileSize), mimeType)}
        >
          <Field label="Folder ID" value={folderId} onChange={setFolderId} placeholder="MongoDB ObjectId of folder" />
          <Field label="File Name" value={fileName} onChange={setFileName} placeholder="document.pdf" />
          <Field label="File Size (bytes)" value={fileSize} onChange={setFileSize} placeholder="e.g. 1048576 for 1MB" type="number" />
          <SelectField label="MIME Type" value={mimeType} onChange={setMimeType} options={MIME_OPTIONS} />
        </ApiCard>

        {/* List files */}
        <ApiCard
          step={4}
          title="List Files"
          method="GET"
          endpoint="/api/v1/storage/list-files"
          description="Returns a paginated list of files. Filter by folderId to list files in a specific folder."
          onSubmit={() => storageApi.listFiles(folderId || undefined, Number(page))}
        >
          <Field label="Folder ID (optional)" value={folderId} onChange={setFolderId} placeholder="Leave empty for all files" />
          <Field label="Page" value={page} onChange={setPage} placeholder="1" type="number" />
        </ApiCard>

        {/* Delete file */}
        <ApiCard
          step={5}
          title="Delete File"
          method="DELETE"
          endpoint="/api/v1/storage/delete-file/:fileId"
          description="Permanently deletes a file from storage and decrements the folder file count."
          onSubmit={() => storageApi.deleteFile(fileId)}
        >
          <Field label="File ID" value={fileId} onChange={setFileId} placeholder="MongoDB ObjectId of file" fullWidth />
        </ApiCard>

        {/* Delete folder */}
        <ApiCard
          step={6}
          title="Delete Folder"
          method="DELETE"
          endpoint="/api/v1/storage/delete-folder/:folderId"
          description="Deletes a folder and ALL its files. This is irreversible."
          onSubmit={() => storageApi.deleteFolder(delFolderId)}
          buttonLabel="Delete Folder"
        >
          <Field label="Folder ID" value={delFolderId} onChange={setDelFolder} placeholder="MongoDB ObjectId of folder" fullWidth />
        </ApiCard>

        {/* Upgrade note */}
        <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
          <strong>More storage?</strong> Storage is part of the subscription plan — there is no separate storage purchase.
          To raise the quota, upgrade to a plan with a larger <code>storageLimit</code> via the Payments module.
        </div>
      </div>
    </div>
  );
}
