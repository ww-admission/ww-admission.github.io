<?php

namespace Tests\Unit;

use App\Models\Attachment;
use App\Models\Candidature;
use App\Models\User;
use App\Services\FileService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FileServiceTest extends TestCase
{
    use RefreshDatabase;

    private FileService $service;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->service = new FileService();
    }

    public function test_store_saves_file_and_creates_attachment(): void
    {
        $user = User::factory()->create();
        $cand = Candidature::factory()->create(['user_id' => $user->id]);

        $file       = UploadedFile::fake()->create('doc.pdf', 200, 'application/pdf');
        $attachment = $this->service->store($file, $cand, $user->id, 'diplome');

        $this->assertInstanceOf(Attachment::class, $attachment);
        $this->assertEquals('doc.pdf', $attachment->original_name);
        $this->assertEquals('diplome', $attachment->field_name);
        Storage::disk('local')->assertExists($attachment->path);
    }

    public function test_delete_removes_file_and_record(): void
    {
        $user       = User::factory()->create();
        $cand       = Candidature::factory()->create(['user_id' => $user->id]);
        $file       = UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf');
        $attachment = $this->service->store($file, $cand, $user->id);

        $path = $attachment->path;
        $this->service->delete($attachment);

        Storage::disk('local')->assertMissing($path);
        $this->assertDatabaseMissing('attachments', ['id' => $attachment->id]);
    }

    public function test_human_size_formats_correctly(): void
    {
        $att = new Attachment(['size' => 1024]);
        $this->assertEquals('1 Ko', $att->humanSize());

        $att->size = 1048576;
        $this->assertEquals('1 Mo', $att->humanSize());

        $att->size = 500;
        $this->assertEquals('500 o', $att->humanSize());
    }

    public function test_is_image_detects_images(): void
    {
        $att = new Attachment(['mime_type' => 'image/png']);
        $this->assertTrue($att->isImage());

        $att->mime_type = 'application/pdf';
        $this->assertFalse($att->isImage());
    }
}
