<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NetworkContactController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Contact::query();

        if ($search = $request->string('search')->trim()) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('role', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%");
            });
        }
        if ($type = $request->string('type')) {
            $query->where('type', $type);
        }
        if ($status = $request->string('status')) {
            $query->where('status', $status);
        }

        $perPage = in_array((int) $request->input('per_page', 30), [30, 50, 100])
            ? (int) $request->input('per_page', 30)
            : 30;

        return response()->json($query->orderByDesc('is_default')->orderBy('name')->paginate($perPage));
    }

    public function show(int $id): JsonResponse
    {
        $contact = Contact::findOrFail($id);
        return response()->json($contact);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type'            => 'required|string',
            'name'            => 'required|string|max:255',
            'role'            => 'required|string|max:255',
            'email'           => 'required|email|unique:contacts,email',
            'phone'           => 'nullable|string',
            'location'        => 'nullable|string',
            'bio'             => 'nullable|string',
            'website'         => 'nullable|url',
            'availability'    => 'nullable|string',
            'linkedin_url'    => 'nullable|url',
            'status'          => 'nullable|string|in:active,inactive,pending',
            'languages'       => 'nullable|array',
            'specializations' => 'nullable|array',
            'tags'            => 'nullable|array',
        ]);

        $contact = Contact::create($data);
        return response()->json($contact, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $contact = Contact::findOrFail($id);
        $data = $request->validate([
            'type'            => 'sometimes|string',
            'name'            => 'sometimes|string|max:255',
            'role'            => 'sometimes|string|max:255',
            'email'           => "sometimes|email|unique:contacts,email,{$id}",
            'phone'           => 'nullable|string',
            'location'        => 'nullable|string',
            'bio'             => 'nullable|string',
            'website'         => 'nullable|url',
            'availability'    => 'nullable|string',
            'linkedin_url'    => 'nullable|url',
            'status'          => 'nullable|string|in:active,inactive,pending',
            'languages'       => 'nullable|array',
            'specializations' => 'nullable|array',
            'tags'            => 'nullable|array',
        ]);
        $contact->update($data);
        return response()->json($contact);
    }

    public function destroy(int $id): JsonResponse
    {
        Contact::findOrFail($id)->delete();
        return response()->json(null, 204);
    }

    // ── Candidat : contacts visibles (is_default + assignés) ──────────────────

    public function candidateContacts(Request $request): JsonResponse
    {
        $contacts = Contact::where('is_default', true)
            ->orWhere('status', 'active')
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get();

        return response()->json($contacts);
    }

    // ── Community : membres publics ────────────────────────────────────────────

    public function community(Request $request): JsonResponse
    {
        $query = \App\Models\User::where('is_community_public', true)
            ->whereNotNull('community_status');

        if ($search = $request->string('search')->trim()) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('destination', 'like', "%{$search}%")
                  ->orWhere('domain', 'like', "%{$search}%")
                  ->orWhere('university', 'like', "%{$search}%");
            });
        }
        if ($status = $request->string('status')) {
            $query->where('community_status', $status);
        }
        if ($dest = $request->string('destination')) {
            $query->where('destination', $dest);
        }
        if ($domain = $request->string('domain')) {
            $query->where('domain', $domain);
        }

        $perPage = in_array((int) $request->input('per_page', 30), [30, 50, 100])
            ? (int) $request->input('per_page', 30)
            : 30;

        $paginator = $query->select([
            'id', 'name', 'nationality', 'community_status as status', 'destination',
            'domain', 'programme', 'university', 'city', 'study_year', 'graduation_year',
            'bio', 'languages', 'looking_for', 'is_verified', 'is_community_public',
            'linkedin_url', 'created_at',
        ])->paginate($perPage);

        return response()->json($paginator);
    }

    // ── Admin : tous les membres community (vérifiés + non vérifiés) ──────────

    public function adminCommunity(Request $request): JsonResponse
    {
        $query = \App\Models\User::whereNotNull('community_status');

        if ($search = $request->string('search')->trim()) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('destination', 'like', "%{$search}%")
                  ->orWhere('domain', 'like', "%{$search}%");
            });
        }
        if ($status = $request->string('status')) {
            $query->where('community_status', $status);
        }

        $perPage = in_array((int) $request->input('per_page', 30), [30, 50, 100])
            ? (int) $request->input('per_page', 30)
            : 30;

        $paginator = $query->select([
            'id', 'name', 'nationality', 'community_status as status', 'destination',
            'domain', 'programme', 'university', 'city', 'study_year', 'graduation_year',
            'bio', 'languages', 'looking_for', 'is_verified', 'is_community_public',
            'linkedin_url', 'created_at',
        ])->paginate($perPage);

        return response()->json($paginator);
    }
}
