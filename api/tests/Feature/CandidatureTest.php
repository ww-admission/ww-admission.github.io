<?php

namespace Tests\Feature;

use App\Models\Candidature;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CandidatureTest extends TestCase
{
    use RefreshDatabase;

    private function adminToken(): array
    {
        $admin = User::factory()->create(['role' => 'admin']);
        return [$admin, $admin->createToken('t')->plainTextToken];
    }

    private function candidateToken(): array
    {
        $user = User::factory()->create(['role' => 'candidate']);
        return [$user, $user->createToken('t')->plainTextToken];
    }

    public function test_candidate_can_submit_candidature(): void
    {
        [, $token] = $this->candidateToken();

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/candidatures', [
                'destination' => 'chine',
                'programme'   => 'Médecine',
                'niveau_vise' => 'Licence',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'pending');

        $this->assertDatabaseHas('candidatures', ['destination' => 'chine', 'status' => 'pending']);
        $this->assertDatabaseHas('conversations', []);
    }

    public function test_candidate_can_view_own_candidatures(): void
    {
        [$user, $token] = $this->candidateToken();
        Candidature::factory()->create(['user_id' => $user->id]);
        Candidature::factory()->create(); // autre candidat

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/candidatures');

        $response->assertStatus(200);
        $data = $response->json('data') ?? $response->json();
        $this->assertCount(1, $data);
    }

    public function test_admin_can_view_all_candidatures(): void
    {
        [, $token] = $this->adminToken();
        Candidature::factory()->count(3)->create();

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/candidatures');

        $data = $response->json('data') ?? $response->json();
        $this->assertCount(3, $data);
    }

    public function test_admin_can_update_status(): void
    {
        [, $token] = $this->adminToken();
        $cand = Candidature::factory()->create(['status' => 'pending']);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/candidatures/{$cand->id}", ['status' => 'reviewing'])
            ->assertStatus(200)
            ->assertJsonPath('status', 'reviewing');
    }

    public function test_candidate_cannot_update_status(): void
    {
        [, $token] = $this->candidateToken();
        $cand = Candidature::factory()->create(['status' => 'pending']);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/candidatures/{$cand->id}", ['status' => 'reviewing'])
            ->assertStatus(403);
    }

    public function test_admin_can_add_comment(): void
    {
        [$admin, $token] = $this->adminToken();
        $cand = Candidature::factory()->create();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/candidatures/{$cand->id}/comments", ['content' => 'Bon dossier.'])
            ->assertStatus(201)
            ->assertJsonPath('content', 'Bon dossier.');
    }

    public function test_candidate_cannot_add_comment(): void
    {
        [, $token] = $this->candidateToken();
        $cand = Candidature::factory()->create();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/candidatures/{$cand->id}/comments", ['content' => 'Test'])
            ->assertStatus(403);
    }

    public function test_candidate_cannot_view_other_candidature(): void
    {
        [, $token] = $this->candidateToken();
        $otherCand = Candidature::factory()->create();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/candidatures/{$otherCand->id}")
            ->assertStatus(403);
    }

    public function test_submission_validation_requires_destination(): void
    {
        [, $token] = $this->candidateToken();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/candidatures', ['programme' => 'Médecine', 'niveau_vise' => 'Licence'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['destination']);
    }

    public function test_stats_endpoint_returns_counts(): void
    {
        [, $token] = $this->adminToken();
        Candidature::factory()->pending()->count(2)->create();
        Candidature::factory()->accepted()->count(1)->create();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/candidatures/stats')
            ->assertStatus(200)
            ->assertJsonPath('total', 3)
            ->assertJsonPath('pending', 2)
            ->assertJsonPath('accepted', 1);
    }
}
