import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ImportResult {
    success: boolean;
    imported: number;
    skipped: number;
    duplicates: number;
    errors: Array<{ row: number; reason: string }>;
}

async function uploadExcel(file: File): Promise<ImportResult> {
    const token = localStorage.getItem('auth_token');
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/import/excel', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(error.error || 'Upload failed');
    }

    return response.json();
}

interface ExcelUploadProps {
    onSuccess?: () => void;
}

export function ExcelUpload({ onSuccess }: ExcelUploadProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const queryClient = useQueryClient();

    const uploadMutation = useMutation({
        mutationFn: uploadExcel,
        onSuccess: (data) => {
            setResult(data);
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            if (data.imported > 0) {
                toast.success(`Imported ${data.imported} expenses`);
            }
            onSuccess?.();
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to import file');
        },
    });

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
            setFile(droppedFile);
            setResult(null);
        } else {
            toast.error('Please upload an Excel file (.xlsx or .xls)');
        }
    }, []);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setResult(null);
        }
    }, []);

    const handleUpload = () => {
        if (file) {
            uploadMutation.mutate(file);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setFile(null);
        setResult(null);
    };

    return (
        <>
            <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
                <Upload className="w-4 h-4 mr-1.5" />
                Import Excel
            </Button>

            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Import Expenses from Excel</DialogTitle>
                        <DialogDescription>
                            Upload an Excel file with columns: Date, Merchant Name, Amount, Category, Payment
                        </DialogDescription>
                    </DialogHeader>

                    {!result ? (
                        <div className="space-y-4">
                            {/* Drop zone */}
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={cn(
                                    'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                                    isDragging
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/50'
                                )}
                            >
                                {file ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <FileSpreadsheet className="w-8 h-8 text-success" />
                                        <div className="text-left">
                                            <p className="font-medium">{file.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {(file.size / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="ml-2"
                                            onClick={() => setFile(null)}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                                        <p className="text-sm text-muted-foreground mb-2">
                                            Drag and drop your Excel file here, or
                                        </p>
                                        <label>
                                            <input
                                                type="file"
                                                accept=".xlsx,.xls"
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                            <span className="text-primary hover:underline cursor-pointer">
                                                browse files
                                            </span>
                                        </label>
                                    </>
                                )}
                            </div>

                            {/* Expected format */}
                            <Card className="bg-muted/50 border-border">
                                <CardContent className="p-3">
                                    <p className="text-xs font-medium mb-2">Expected columns:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {['Date', 'Merchant Name', 'Amount', 'Category', 'Payment'].map((col) => (
                                            <span
                                                key={col}
                                                className="text-xs bg-background px-2 py-0.5 rounded"
                                            >
                                                {col}
                                            </span>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <Button variant="outline" className="flex-1" onClick={handleClose}>
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={handleUpload}
                                    disabled={!file || uploadMutation.isPending}
                                >
                                    {uploadMutation.isPending ? 'Importing...' : 'Import'}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        /* Result view */
                        <div className="space-y-4">
                            <div className="text-center py-4">
                                {result.imported > 0 ? (
                                    <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
                                ) : (
                                    <AlertCircle className="w-12 h-12 text-warning mx-auto mb-3" />
                                )}
                                <p className="font-medium">Import Complete</p>
                            </div>

                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="p-3 rounded-lg bg-success/10">
                                    <p className="text-2xl font-bold text-success">{result.imported}</p>
                                    <p className="text-xs text-muted-foreground">Imported</p>
                                </div>
                                <div className="p-3 rounded-lg bg-warning/10">
                                    <p className="text-2xl font-bold text-warning">{result.skipped}</p>
                                    <p className="text-xs text-muted-foreground">Skipped</p>
                                </div>
                                <div className="p-3 rounded-lg bg-muted">
                                    <p className="text-2xl font-bold">{result.duplicates}</p>
                                    <p className="text-xs text-muted-foreground">Duplicates</p>
                                </div>
                            </div>

                            {result.errors.length > 0 && (
                                <div className="max-h-32 overflow-y-auto text-sm">
                                    <p className="font-medium mb-2">Errors:</p>
                                    {result.errors.slice(0, 5).map((err, i) => (
                                        <p key={i} className="text-muted-foreground">
                                            Row {err.row}: {err.reason}
                                        </p>
                                    ))}
                                    {result.errors.length > 5 && (
                                        <p className="text-muted-foreground">
                                            ...and {result.errors.length - 5} more
                                        </p>
                                    )}
                                </div>
                            )}

                            <Button className="w-full" onClick={handleClose}>
                                Done
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
