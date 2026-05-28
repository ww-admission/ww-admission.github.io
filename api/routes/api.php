<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CandidatureController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\LogController;
use Illuminate\Support\Facades\Route;

// ── Auth (public) ──────────────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('/login',    [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
});

// ── Auth (protégé) ─────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->prefix('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me',      [AuthController::class, 'me']);
});

// ── Routes protégées ───────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Candidatures
    Route::get('/candidatures',                    [CandidatureController::class, 'index']);
    Route::post('/candidatures',                   [CandidatureController::class, 'store']);
    Route::get('/candidatures/{id}',               [CandidatureController::class, 'show']);
    Route::patch('/candidatures/{id}',             [CandidatureController::class, 'update']);
    Route::post('/candidatures/{id}/comments',     [CandidatureController::class, 'addComment']);

    // Messagerie
    Route::get('/conversations',                          [ConversationController::class, 'index']);
    Route::get('/conversations/{id}/messages',            [ConversationController::class, 'messages']);
    Route::post('/conversations/{id}/messages',           [ConversationController::class, 'sendMessage']);

    // Logs (admin uniquement, vérifié dans le controller)
    Route::get('/logs', [LogController::class, 'index']);
});
