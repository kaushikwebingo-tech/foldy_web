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

const PLAN_OPTIONS = [
  { label: '8 GB Monthly',  value: 'storage_8gb'  },
  { label: '15 GB Monthly', value: 'storage_15gb' },
  { label: '20 GB Monthly', value: 'storage_20gb' },
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
  const [planType, setPlanType]       = useState('storage_8gb');

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Document Storage Vault"
        subtitle="Create folders, upload files (simulated), manage storage quota and paid plans."
        icon={<FolderOpen size={18} />}
        badge="Auth Required"
        postmanSection="storage"
      />

      <div className="space-y-4">
        {/* Usage */}
        <ApiCard
          title="Get Storage Usage & Info"
          method="GET"
          endpoint="/api/v1/storage/info"
          description="Returns storage usage, plan details, folder list and quota limits for the logged-in user."
          onSubmit={() => storageApi.getInfo()}
        />

        {/* Create folder */}
        <ApiCard
          title="Create Folder"
          method="POST"
          endpoint="/api/v1/storage/create-folder"
          description="Creates a new folder. Free plan allows up to 4 folders."
          onSubmit={() => storageApi.createFolder(folderName)}
        >
          <Field label="Folder Name" value={folderName} onChange={setFolderName} placeholder="e.g. ITR Documents" />
        </ApiCard>

        {/* Upload file */}
        <ApiCard
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
          title="Delete Folder"
          method="DELETE"
          endpoint="/api/v1/storage/delete-folder/:folderId"
          description="Deletes a folder and ALL its files. This is irreversible."
          onSubmit={() => storageApi.deleteFolder(delFolderId)}
          buttonLabel="Delete Folder"
        >
          <Field label="Folder ID" value={delFolderId} onChange={setDelFolder} placeholder="MongoDB ObjectId of folder" fullWidth />
        </ApiCard>

        {/* Divider */}
        <div className="border-t border-slate-200 pt-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Paid Storage Plans</p>
        </div>

        {/* List plans */}
        <ApiCard
          title="List Available Storage Plans"
          method="GET"
          endpoint="/api/v1/storage/plans"
          description="Returns available paid storage plan options with pricing."
          onSubmit={() => storageApi.listPlans()}
        />

        {/* Plan status */}
        <ApiCard
          title="Get Storage Plan Status"
          method="GET"
          endpoint="/api/v1/storage/plans/status"
          description="Returns current paid storage subscription status for the logged-in user."
          onSubmit={() => storageApi.getPlanStatus()}
        />

        {/* Create plan order */}
        <ApiCard
          title="Create Storage Plan Order"
          method="POST"
          endpoint="/api/v1/storage/plans/create-order"
          description="Creates a Razorpay order for a paid storage plan upgrade."
          onSubmit={() => storageApi.createPlanOrder(planType)}
        >
          <SelectField label="Plan Type" value={planType} onChange={setPlanType} options={PLAN_OPTIONS} fullWidth />
        </ApiCard>

        {/* Plan history */}
        <ApiCard
          title="Storage Plan History"
          method="GET"
          endpoint="/api/v1/storage/plans/history"
          description="Returns the storage subscription payment history for the logged-in user."
          onSubmit={() => storageApi.getPlanHistory()}
        />
      </div>
    </div>
  );
}
