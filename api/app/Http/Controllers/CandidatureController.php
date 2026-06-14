<?php

namespace App\Http\Controllers;

use App\Events\CandidatureStatusChanged;
use App\Events\CandidatureSubmitted;
use App\Events\CommentAdded;
use App\Http\Requests\StoreCommentRequest;
use App\Http\Requests\StoreCandidatureRequest;
use App\Http\Requests\UpdateCandidatureRequest;
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
        $this->authorize('viewAny', Candidature::class);

        $user  = $request->user();
        $query = Candidature::with(['user', 'comments.author', 'attachments'])
            ->latest('submitted_at');

        if ($user->role !== 'admin') {
            $query->where('user_id', $user->id);
        }

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $perPage = min((int) ($request->per_page ?? 30), 100);

        return response()->json($query->paginate($perPage)->through(fn ($c) => $this->format($c)));
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $cand = Candidature::with(['user', 'comments.author', 'attachments', 'conversation'])->findOrFail($id);

        $this->authorize('view', $cand);

        return response()->json($this->format($cand));
    }

    public function store(StoreCandidatureRequest $request): JsonResponse
    {
        $user      = $request->user();
        $reference = $request->validated()['reference'] ?? null;

        // Idempotence : si une candidature avec cette référence existe déjà, la retourner
        if ($reference) {
            $existing = Candidature::where('user_id', $user->id)
                ->where('reference', $reference)
                ->with(['user', 'comments.author', 'attachments'])
                ->first();
            if ($existing) {
                return response()->json($this->format($existing), 200);
            }
        }

        $cand = Candidature::create([
            ...$request->validated(),
            'user_id'      => $user->id,
            'status'       => 'pending',
            'submitted_at' => now(),
        ]);

        Conversation::firstOrCreate(
            ['candidate_id' => $user->id, 'candidature_id' => $cand->id]
        );

        AppLog::record('candidature.submitted', 'Nouvelle candidature soumise', $user, (string) $cand->id, 'candidature');

        CandidatureSubmitted::dispatch($cand->load('user'));

        return response()->json($this->format($cand->load('user', 'comments.author', 'attachments')), 201);
    }

    public function update(UpdateCandidatureRequest $request, int $id): JsonResponse
    {
        $cand = Candidature::with(['user', 'comments.author', 'attachments'])->findOrFail($id);

        $this->authorize('update', $cand);

        $old  = $cand->status;
        $data = $request->validated();

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

            CandidatureStatusChanged::dispatch($cand, $old, $data['status']);
        }

        return response()->json($this->format($cand));
    }

    public function addComment(StoreCommentRequest $request, int $id): JsonResponse
    {
        $cand = Candidature::with('user')->findOrFail($id);

        $this->authorize('addComment', $cand);

        $comment = CandidatureComment::create([
            'candidature_id' => $cand->id,
            'user_id'        => $request->user()->id,
            'content'        => $request->validated()['content'],
        ]);

        AppLog::record(
            'candidature.comment_added',
            "Commentaire ajouté sur la candidature de {$cand->user->name}",
            $request->user(),
            (string) $cand->id,
            'candidature',
        );

        CommentAdded::dispatch($comment->load('author'));

        return response()->json([
            'id'          => $comment->id,
            'authorName'  => $request->user()->name,
            'content'     => $comment->content,
            'createdAt'   => $comment->created_at,
        ], 201);
    }

    // ── Stats pour le dashboard admin ────────────────────────────────────────

    public function stats(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403);

        return response()->json([
            'total'     => Candidature::count(),
            'pending'   => Candidature::where('status', 'pending')->count(),
            'reviewing' => Candidature::where('status', 'reviewing')->count(),
            'accepted'  => Candidature::where('status', 'accepted')->count(),
            'rejected'  => Candidature::where('status', 'rejected')->count(),
            'on_hold'   => Candidature::where('status', 'on_hold')->count(),
        ]);
    }

    // ── Format ───────────────────────────────────────────────────────────────

    private function format(Candidature $c): array
    {
        return [
            'id'             => $c->id,
            'candidateId'    => $c->user_id,
            'candidateName'  => $c->user->name,
            'candidateEmail' => $c->user->email,
            'candidatePhone' => $c->personal_info['telephone'] ?? '',
            'destination'    => $c->destination,
            'programme'      => $c->programme,
            'niveauVise'     => $c->niveau_vise,
            'status'         => $c->status,
            'submittedAt'    => $c->submitted_at,
            'updatedAt'      => $c->updated_at,
            'personalInfo'   => $c->personal_info ?? [],
            'academicInfo'   => $c->academic_info ?? [],
            'documents'      => $c->documents ?? [],
            'complementary'  => $c->complementary_info ?? [],
            'attachments'    => ($c->relationLoaded('attachments') ? $c->attachments : collect())->map(fn ($a) => [
                'id'           => $a->id,
                'originalName' => $a->original_name,
                'mimeType'     => $a->mime_type,
                'humanSize'    => $a->humanSize(),
                'fieldName'    => $a->field_name,
                'isImage'      => $a->isImage(),
                'createdAt'    => $a->created_at,
            ]),
            'comments' => ($c->relationLoaded('comments') ? $c->comments : collect())->map(fn ($cm) => [
                'id'         => $cm->id,
                'authorName' => $cm->author->name,
                'content'    => $cm->content,
                'createdAt'  => $cm->created_at,
            ]),
        ];
    }
}
