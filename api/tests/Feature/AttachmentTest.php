<?php

namespace Tests\Feature;

use App\Models\Candidature;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AttachmentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        Queue::fake(); // empêche ProcessAttachment de supprimer les fichiers fake
    }

    public function test_candidate_can_upload_attachment_to_own_candidature(): void
    {
        $user  = User::factory()->create(['role' => 'candidate']);
        $cand  = Candidature::factory()->create(['user_id' => $user->id]);
        $token = $user->createToken('t')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/attachments', [
                'file'             => UploadedFile::fake()->create('diplome.pdf', 500, 'application/pdf'),
                'attachable_type'  => 'candidature',
                'attachable_id'    => $cand->id,
                'field_name'       => 'diplome',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('originalName', 'diplome.pdf');

        $this->assertDatabaseHas('attachments', [
            'attachable_type' => Candidature::class,
            'attachable_id'   => $cand->id,
        ]);
    }

    public function test_candidate_cannot_upload_to_other_candidature(): void
    {
        $user  = User::factory()->create(['role' => 'candidate']);
        $other = Candidature::factory()->create();
        $token = $user->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/attachments', [
                'file'            => UploadedFile::fake()->create('test.pdf', 100, 'application/pdf'),
                'attachable_type' => 'candidature',
                'attachable_id'   => $other->id,
            ])
            ->assertStatus(403);
    }

    public function test_invalid_mime_type_rejected(): void
    {
        $user  = User::factory()->create(['role' => 'candidate']);
        $cand  = Candidature::factory()->create(['user_id' => $user->id]);
        $token = $user->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/attachments', [
                'file'            => UploadedFile::fake()->create('virus.exe', 100, 'application/octet-stream'),
                'attachable_type' => 'candidature',
                'attachable_id'   => $cand->id,
            ])
            ->assertStatus(422);
    }

    public function test_file_too_large_rejected(): void
    {
        $user  = User::factory()->create(['role' => 'candidate']);
        $cand  = Candidature::factory()->create(['user_id' => $user->id]);
        $token = $user->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/attachments', [
                'file'            => UploadedFile::fake()->create('big.pdf', 15000, 'application/pdf'),
                'attachable_type' => 'candidature',
                'attachable_id'   => $cand->id,
            ])
            ->assertStatus(422);
    }

    public function test_candidate_can_download_own_attachment(): void
    {
        $user  = User::factory()->create(['role' => 'candidate']);
        $cand  = Candidature::factory()->create(['user_id' => $user->id]);
        $token = $user->createToken('t')->plainTextToken;

        $file = UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf');

        $uploadResp = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/attachments', [
                'file'            => $file,
                'attachable_type' => 'candidature',
                'attachable_id'   => $cand->id,
            ]);

        $attachmentId = $uploadResp->json('id');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/attachments/{$attachmentId}/download")
            ->assertStatus(200);
    }
}
