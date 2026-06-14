<?php

namespace App\Jobs;

use App\Models\Attachment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ProcessAttachment implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public readonly Attachment $attachment)
    {
    }

    public function handle(): void
    {
        if (! Storage::disk($this->attachment->disk)->exists($this->attachment->path)) {
            Log::warning('ProcessAttachment: fichier introuvable', ['id' => $this->attachment->id]);
            return;
        }

        // Validation MIME réelle via finfo (double vérification côté serveur)
        $absolutePath = Storage::disk($this->attachment->disk)->path($this->attachment->path);
        $finfo        = new \finfo(FILEINFO_MIME_TYPE);
        $realMime     = $finfo->file($absolutePath);

        $allowed = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];

        if (! in_array($realMime, $allowed, true)) {
            Log::warning('ProcessAttachment: MIME réel invalide', [
                'id'   => $this->attachment->id,
                'mime' => $realMime,
            ]);
            // Supprimer le fichier dangereux
            Storage::disk($this->attachment->disk)->delete($this->attachment->path);
            $this->attachment->delete();
        }
    }
}
