<?php

namespace App\Http\Controllers;

use App\Http\Requests\UploadAttachmentRequest;
use App\Jobs\ProcessAttachment;
use App\Models\Attachment;
use App\Models\Candidature;
use App\Models\ContactSubmission;
use App\Services\FileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttachmentController extends Controller
{
    public function __construct(private readonly FileService $fileService)
    {
    }

    public function store(UploadAttachmentRequest $request): JsonResponse
    {
        $attachable = match ($request->attachable_type) {
            'candidature' => Candidature::findOrFail($request->attachable_id),
            'contact'     => ContactSubmission::findOrFail($request->attachable_id),
            default       => abort(422, 'Type non supporté.'),
        };

        // Vérifier les droits sur la candidature
        if ($attachable instanceof Candidature) {
            $this->authorize('manageAttachments', $attachable);
        }

        $attachment = $this->fileService->store(
            $request->file('file'),
            $attachable,
            $request->user()?->id,
            $request->field_name,
        );

        // Validation MIME réelle en arrière-plan
        ProcessAttachment::dispatch($attachment);

        return response()->json($this->format($attachment), 201);
    }

    public function download(Request $request, Attachment $attachment): StreamedResponse
    {
        $this->authorize('view', $attachment);

        return $this->fileService->download($attachment);
    }

    public function preview(Request $request, Attachment $attachment): StreamedResponse
    {
        $this->authorize('view', $attachment);

        return $this->fileService->preview($attachment);
    }

    public function destroy(Request $request, Attachment $attachment): JsonResponse
    {
        $this->authorize('delete', $attachment);

        $this->fileService->delete($attachment);

        return response()->json(['ok' => true]);
    }

    private function format(Attachment $a): array
    {
        return [
            'id'           => $a->id,
            'originalName' => $a->original_name,
            'mimeType'     => $a->mime_type,
            'size'         => $a->size,
            'humanSize'    => $a->humanSize(),
            'fieldName'    => $a->field_name,
            'isImage'      => $a->isImage(),
            'createdAt'    => $a->created_at,
        ];
    }
}
