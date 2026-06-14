<?php

namespace App\Services;

use App\Models\Attachment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FileService
{
    private const DISK = 'local';

    private const ALLOWED_MIMES = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    // MIME supplémentaires autorisés dans le contexte messagerie
    private const MESSAGE_MIMES = [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/zip',
        'application/x-zip-compressed',
    ];

    private const MAX_BYTES = 10 * 1024 * 1024; // 10 Mo

    /**
     * Stocker un fichier et créer l'enregistrement Attachment.
     */
    /**
     * Stocker un fichier attaché à un Message (MIME élargis).
     */
    public function storeForMessage(UploadedFile $file, Model $message, ?int $uploadedBy = null): Attachment
    {
        return $this->store($file, $message, $uploadedBy, null, self::MESSAGE_MIMES);
    }

    public function store(
        UploadedFile $file,
        Model $attachable,
        ?int $uploadedBy = null,
        ?string $fieldName = null,
        ?array $allowedMimes = null,
    ): Attachment {
        $this->validateFile($file, $allowedMimes ?? self::ALLOWED_MIMES);

        $originalName  = $this->sanitizeName($file->getClientOriginalName());
        $extension     = strtolower($file->getClientOriginalExtension());
        $storedName    = Str::uuid() . '.' . $extension;
        $folder        = $this->folderFor($attachable);
        $path          = $file->storeAs($folder, $storedName, self::DISK);

        return Attachment::create([
            'attachable_type' => get_class($attachable),
            'attachable_id'   => $attachable->getKey(),
            'original_name'   => $originalName,
            'stored_name'     => $storedName,
            'mime_type'       => $file->getMimeType() ?? 'application/octet-stream',
            'size'            => $file->getSize(),
            'path'            => $path,
            'disk'            => self::DISK,
            'field_name'      => $fieldName,
            'uploaded_by'     => $uploadedBy,
        ]);
    }

    /**
     * Streamer le fichier au navigateur (téléchargement).
     */
    public function download(Attachment $attachment): StreamedResponse
    {
        $this->assertExists($attachment);

        return Storage::disk($attachment->disk)->download(
            $attachment->path,
            $attachment->original_name,
        );
    }

    /**
     * Streamer le fichier inline (prévisualisation navigateur pour PDF/images).
     */
    public function preview(Attachment $attachment): StreamedResponse
    {
        $this->assertExists($attachment);

        return response()->stream(function () use ($attachment) {
            $stream = Storage::disk($attachment->disk)->readStream($attachment->path);
            fpassthru($stream);
            if (is_resource($stream)) {
                fclose($stream);
            }
        }, 200, [
            'Content-Type'        => $attachment->mime_type,
            'Content-Disposition' => 'inline; filename="' . addslashes($attachment->original_name) . '"',
            'Content-Length'      => $attachment->size,
            'Cache-Control'       => 'no-store',
        ]);
    }

    /**
     * Supprimer le fichier physique et l'enregistrement.
     */
    public function delete(Attachment $attachment): void
    {
        if (Storage::disk($attachment->disk)->exists($attachment->path)) {
            Storage::disk($attachment->disk)->delete($attachment->path);
        }

        $attachment->delete();
    }

    // ─── Privé ──────────────────────────────────────────────────────────────

    private function validateFile(UploadedFile $file, array $allowedMimes): void
    {
        if ($file->getSize() > self::MAX_BYTES) {
            abort(422, 'La taille du fichier dépasse 10 Mo.');
        }

        if (! in_array($file->getMimeType(), $allowedMimes, true)) {
            abort(422, 'Type de fichier non autorisé : ' . $file->getMimeType());
        }
    }

    private function sanitizeName(string $name): string
    {
        // Supprimer les caractères dangereux, garder extension
        $name = preg_replace('/[^\w\-. ]/', '_', $name);
        return substr($name, 0, 255);
    }

    private function folderFor(Model $attachable): string
    {
        $type = class_basename(get_class($attachable));
        return 'attachments/' . strtolower($type) . 's/' . $attachable->getKey();
    }

    private function assertExists(Attachment $attachment): void
    {
        if (! Storage::disk($attachment->disk)->exists($attachment->path)) {
            abort(404, 'Fichier introuvable.');
        }
    }
}
