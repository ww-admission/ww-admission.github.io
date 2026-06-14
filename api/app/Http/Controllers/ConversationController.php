<?php

namespace App\Http\Controllers;

use App\Events\MessageRead;
use App\Events\MessageSent;
use App\Http\Requests\StoreMessageRequest;
use App\Models\AppLog;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\FileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    public function __construct(private readonly FileService $fileService) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Conversation::class);

        $user  = $request->user();
        $query = Conversation::with(['candidate', 'candidature', 'lastMessage.sender']);

        if ($user->role !== 'admin') {
            $query->where('candidate_id', $user->id);
        }

        $conversations = $query->latest('updated_at')->get()->map(function ($conv) use ($user) {
            $last = $conv->lastMessage;

            return [
                'id'            => $conv->id,
                'candidateId'   => $conv->candidate_id,
                'candidateName' => $conv->candidate->name,
                'candidateEmail'=> $conv->candidate->email,
                'candidatureId' => $conv->candidature_id,
                'unreadCount'   => $conv->unreadCountFor($user),
                'lastMessage'   => $last ? [
                    'content'    => $last->content,
                    'createdAt'  => $last->created_at,
                    'senderRole' => $last->sender->role,
                ] : null,
            ];
        });

        return response()->json($conversations);
    }

    public function messages(Request $request, int $id): JsonResponse
    {
        $conv = Conversation::findOrFail($id);

        $this->authorize('view', $conv);

        $user = $request->user();

        // Marquer les messages non lus comme lus, et collecter leurs IDs pour broadcast
        $unreadIds = Message::where('conversation_id', $id)
            ->where('sender_id', '!=', $user->id)
            ->whereNull('read_at')
            ->pluck('id')
            ->toArray();

        if (! empty($unreadIds)) {
            Message::whereIn('id', $unreadIds)->update(['read_at' => now()]);

            // Notifier l'autre partie que ses messages ont été lus
            MessageRead::dispatch($id, $user->id, $unreadIds);
        }

        $messages = $conv->messages()->with(['sender', 'attachments'])->get()->map(fn ($m) => $this->formatMessage($m));

        return response()->json($messages);
    }

    public function sendMessage(StoreMessageRequest $request, int $id): JsonResponse
    {
        $conv = Conversation::findOrFail($id);

        $this->authorize('sendMessage', $conv);

        $user    = $request->user();
        $message = Message::create([
            'conversation_id' => $conv->id,
            'sender_id'       => $user->id,
            'content'         => $request->input('content', ''),
        ]);

        // Stocker les pièces jointes
        if ($request->hasFile('files')) {
            foreach ($request->file('files') as $file) {
                $this->fileService->storeForMessage($file, $message, $user->id);
            }
        }

        $conv->touch();

        AppLog::record('message.sent', "Message envoyé dans la conversation #{$conv->id}", $user, (string) $conv->id, 'conversation');

        $message->load(['sender', 'attachments']);

        MessageSent::dispatch($message);

        return response()->json($this->formatMessage($message), 201);
    }

    // ── Endpoint de polling léger ─────────────────────────────────────────────

    public function poll(Request $request, int $id): JsonResponse
    {
        $conv = Conversation::findOrFail($id);

        $this->authorize('view', $conv);

        $user  = $request->user();
        $since = $request->query('since'); // ISO timestamp

        $query = $conv->messages()->with('sender');

        if ($since) {
            $query->where('created_at', '>', $since);
        }

        $newMessages = $query->with(['sender', 'attachments'])->get()->map(fn ($m) => $this->formatMessage($m));
        $unread      = $conv->unreadCountFor($user);

        return response()->json([
            'newMessages' => $newMessages,
            'unreadCount' => $unread,
        ]);
    }

    // ── Format ────────────────────────────────────────────────────────────────

    private function formatMessage(Message $m): array
    {
        return [
            'id'             => $m->id,
            'conversationId' => $m->conversation_id,
            'senderId'       => $m->sender_id,
            'senderName'     => $m->sender->name,
            'senderRole'     => $m->sender->role,
            'content'        => $m->content,
            'createdAt'      => $m->created_at,
            'read'           => ! is_null($m->read_at),
            'attachments'    => $m->relationLoaded('attachments')
                ? $m->attachments->map(fn ($a) => $this->formatAttachment($a))->values()->toArray()
                : [],
        ];
    }

    private function formatAttachment(\App\Models\Attachment $a): array
    {
        return [
            'id'           => $a->id,
            'originalName' => $a->original_name,
            'mimeType'     => $a->mime_type,
            'size'         => $a->size,
            'humanSize'    => $a->humanSize(),
            'isImage'      => $a->isImage(),
            'previewUrl'   => "/api/attachments/{$a->id}/preview",
            'downloadUrl'  => "/api/attachments/{$a->id}/download",
        ];
    }
}
