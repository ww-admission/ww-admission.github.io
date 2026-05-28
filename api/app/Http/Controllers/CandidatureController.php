<?php

namespace App\Http\Controllers;

use App\Models\AppLog;
use App\Models\Candidature;
use App\Models\CandidatureComment;
use App\Models\Conversation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CandidatureController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Candidature::with(['user', 'comments.author'])->latest('submitted_at');

        if ($user->role !== 'admin') {
            $query->where('user_id', $user->id);
        }

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        return response()->json($query->get()->map(fn ($c) => $this->format($c)));
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $user  = $request->user();
        $cand  = Candidature::with(['user', 'comments.author'])->findOrFail($id);

        if ($user->role !== 'admin' && $cand->user_id !== $user->id) {
            abort(403);
        }

        return response()->json($this->format($cand));
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'destination'        => 'required|string',
            'programme'          => 'required|string',
            'niveau_vise'        => 'required|string',
            'personal_info'      => 'nullable|array',
            'academic_info'      => 'nullable|array',
            'documents'          => 'nullable|array',
            'complementary_info' => 'nullable|array',
        ]);

        $cand = Candidature::create([
            ...$data,
            'user_id'      => $user->id,
            'status'       => 'pending',
            'submitted_at' => now(),
        ]);

        // Créer une conversation pour ce candidat si elle n'existe pas
        Conversation::firstOrCreate(
            ['candidate_id' => $user->id, 'candidature_id' => $cand->id]
        );

        AppLog::record(
            'candidature.submitted',
            'Nouvelle candidature soumise',
            $user,
            (string) $cand->id,
            'candidature',
        );

        return response()->json($this->format($cand->load('user', 'comments.author')), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if ($request->user()->role !== 'admin') {
            abort(403);
        }

        $cand = Candidature::findOrFail($id);
        $old  = $cand->status;

        $data = $request->validate([
            'status' => 'sometimes|in:pending,reviewing,on_hold,accepted,rejected',
        ]);

        $cand->update($data);

        if (isset($data['status']) && $data['status'] !== $old) {
            AppLog::record(
                'candidature.status_changed',
                "Statut changé : {$old} → {$data['status']}",
                $request->user(),
                (string) $cand->id,
                'candidature',
                ['from' => $old, 'to' => $data['status']],
            );
        }

        return response()->json($this->format($cand->load('user', 'comments.author')));
    }

    public function addComment(Request $request, int $id): JsonResponse
    {
        if ($request->user()->role !== 'admin') {
            abort(403);
        }

        $cand = Candidature::findOrFail($id);

        $data = $request->validate(['content' => 'required|string']);

        $comment = CandidatureComment::create([
            'candidature_id' => $cand->id,
            'user_id'        => $request->user()->id,
            'content'        => $data['content'],
        ]);

        AppLog::record(
            'candidature.comment_added',
            "Commentaire ajouté sur la candidature de {$cand->user->name}",
            $request->user(),
            (string) $cand->id,
            'candidature',
        );

        return response()->json([
            'id'          => $comment->id,
            'authorName'  => $request->user()->name,
            'content'     => $comment->content,
            'createdAt'   => $comment->created_at,
        ], 201);
    }

    private function format(Candidature $c): array
    {
        return [
            'id'              => $c->id,
            'candidateId'     => $c->user_id,
            'candidateName'   => $c->user->name,
            'candidateEmail'  => $c->user->email,
            'candidatePhone'  => $c->personal_info['telephone'] ?? '',
            'destination'     => $c->destination,
            'programme'       => $c->programme,
            'niveauVise'      => $c->niveau_vise,
            'status'          => $c->status,
            'submittedAt'     => $c->submitted_at,
            'updatedAt'       => $c->updated_at,
            'personalInfo'    => $c->personal_info ?? [],
            'academicInfo'    => $c->academic_info ?? [],
            'documents'       => $c->documents ?? [],
            'complementary'   => $c->complementary_info ?? [],
            'comments'        => $c->comments->map(fn ($cm) => [
                'id'         => $cm->id,
                'authorName' => $cm->author->name,
                'content'    => $cm->content,
                'createdAt'  => $cm->created_at,
            ]),
        ];
    }
}
