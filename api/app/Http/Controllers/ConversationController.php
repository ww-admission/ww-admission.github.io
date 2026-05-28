<?php

namespace App\Http\Controllers;

use App\Models\AppLog;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Conversation::with(['candidate', 'candidature', 'lastMessage.sender']);

        if ($user->role !== 'admin') {
            $query->where('candidate_id', $user->id);
        }

        $conversations = $query->get()->map(function ($conv) use ($user) {
            $last = $conv->lastMessage;
            return [
                'id'              => $conv->id,
                'candidateId'     => $conv->candidate_id,
                'candidateName'   => $conv->candidate->name,
                'candidateEmail'  => $conv->candidate->email,
                'candidatureId'   => $conv->candidature_id,
                'unreadCount'     => $conv->unreadCountFor($user),
                'lastMessage'     => $last ? [
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
        $user = $request->user();
        $conv = Conversation::findOrFail($id);

        if ($user->role !== 'admin' && $conv->candidate_id !== $user->id) {
            abort(403);
        }

        // Marquer les messages non lus comme lus
        Message::where('conversation_id', $id)
            ->where('sender_id', '!=', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        $messages = $conv->messages()->with('sender')->get()->map(fn ($m) => [
            'id'             => $m->id,
            'conversationId' => $m->conversation_id,
            'senderId'       => $m->sender_id,
            'senderName'     => $m->sender->name,
            'senderRole'     => $m->sender->role,
            'content'        => $m->content,
            'createdAt'      => $m->created_at,
            'read'           => ! is_null($m->read_at),
        ]);

        return response()->json($messages);
    }

    public function sendMessage(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $conv = Conversation::findOrFail($id);

        if ($user->role !== 'admin' && $conv->candidate_id !== $user->id) {
            abort(403);
        }

        $data = $request->validate(['content' => 'required|string|max:5000']);

        $message = Message::create([
            'conversation_id' => $conv->id,
            'sender_id'       => $user->id,
            'content'         => $data['content'],
        ]);

        AppLog::record(
            'message.sent',
            "Message envoyé dans la conversation #{$conv->id}",
            $user,
            (string) $conv->id,
            'conversation',
        );

        return response()->json([
            'id'             => $message->id,
            'conversationId' => $message->conversation_id,
            'senderId'       => $message->sender_id,
            'senderName'     => $user->name,
            'senderRole'     => $user->role,
            'content'        => $message->content,
            'createdAt'      => $message->created_at,
            'read'           => false,
        ], 201);
    }
}
