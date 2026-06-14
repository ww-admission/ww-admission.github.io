<?php

namespace App\Events;

use App\Models\Candidature;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CandidatureSubmitted
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly Candidature $candidature)
    {
    }
}
