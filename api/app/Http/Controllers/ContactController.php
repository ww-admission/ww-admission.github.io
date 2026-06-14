<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreContactRequest;
use App\Models\AppLog;
use App\Models\ContactSubmission;
use App\Models\User;
use App\Notifications\CandidatureSubmittedNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    public function store(StoreContactRequest $request): JsonResponse
    {
        $submission = ContactSubmission::create($request->validated());

        AppLog::record(
            'contact.submitted',
            "Message de contact de {$submission->name} ({$submission->email})",
            null,
            (string) $submission->id,
            'contact_submission',
        );

        return response()->json([
            'id'      => $submission->id,
            'message' => 'Votre message a bien été reçu.',
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403);

        $submissions = ContactSubmission::with('attachments')
            ->latest()
            ->paginate(20);

        return response()->json($submissions->through(fn ($s) => [
            'id'          => $s->id,
            'name'        => $s->name,
            'email'       => $s->email,
            'phone'       => $s->phone,
            'subject'     => $s->subject,
            'message'     => $s->message,
            'status'      => $s->status,
            'attachments' => $s->attachments->map(fn ($a) => [
                'id'           => $a->id,
                'originalName' => $a->original_name,
                'mimeType'     => $a->mime_type,
                'humanSize'    => $a->humanSize(),
                'isImage'      => $a->isImage(),
            ]),
            'createdAt' => $s->created_at,
        ]));
    }

    public function updateStatus(Request $request, ContactSubmission $submission): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403);

        $data = $request->validate([
            'status' => 'required|in:new,read,archived',
        ]);

        $submission->update($data);

        return response()->json(['ok' => true]);
    }
}
