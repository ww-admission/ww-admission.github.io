<?php

use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CandidatureController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\LogController;
use App\Http\Controllers\NetworkContactController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// ── Auth (public) ──────────────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('/login',    [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
});

// ── Contact public (visiteurs non authentifiés) ────────────────────────────
Route::post('/contact', [ContactController::class, 'store']);

// ── Routes protégées (Sanctum) ─────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me',      [AuthController::class, 'me']);
    });

    // Candidatures
    Route::get('/candidatures/stats',              [CandidatureController::class, 'stats']);
    Route::get('/candidatures',                    [CandidatureController::class, 'index']);
    Route::post('/candidatures',                   [CandidatureController::class, 'store']);
    Route::get('/candidatures/{id}',               [CandidatureController::class, 'show']);
    Route::patch('/candidatures/{id}',             [CandidatureController::class, 'update']);
    Route::post('/candidatures/{id}/comments',     [CandidatureController::class, 'addComment']);

    // Messagerie
    Route::get('/conversations',                         [ConversationController::class, 'index']);
    Route::get('/conversations/{id}/messages',           [ConversationController::class, 'messages']);
    Route::post('/conversations/{id}/messages',          [ConversationController::class, 'sendMessage']);
    Route::get('/conversations/{id}/poll',               [ConversationController::class, 'poll']);

    // Pièces jointes
    Route::post('/attachments',                          [AttachmentController::class, 'store']);
    Route::get('/attachments/{attachment}/download',     [AttachmentController::class, 'download']);
    Route::get('/attachments/{attachment}/preview',      [AttachmentController::class, 'preview']);
    Route::delete('/attachments/{attachment}',           [AttachmentController::class, 'destroy']);

    // Notifications DB
    Route::get('/notifications',                         [NotificationController::class, 'index']);
    Route::post('/notifications/read-all',               [NotificationController::class, 'markAllRead']);
    Route::patch('/notifications/{id}/read',             [NotificationController::class, 'markRead']);

    // Réseau contacts (candidat : lecture seule)
    Route::get('/network/contacts',                      [NetworkContactController::class, 'candidateContacts']);

    // Communauté (profils publics)
    Route::get('/community',                             [NetworkContactController::class, 'community']);

    // Admin seulement
    Route::middleware('admin')->group(function () {
        Route::get('/logs',                              [LogController::class, 'index']);
        Route::get('/contact',                           [ContactController::class, 'index']);
        Route::patch('/contact/{submission}/status',     [ContactController::class, 'updateStatus']);
        Route::get('/users',                             [UserController::class, 'index']);
        Route::patch('/users/{id}',                      [UserController::class, 'update']);

        // Réseau contacts — admin CRUD
        Route::get('/network/contacts',                  [NetworkContactController::class, 'index']);
        Route::post('/network/contacts',                 [NetworkContactController::class, 'store']);
        Route::get('/network/contacts/{id}',             [NetworkContactController::class, 'show']);
        Route::patch('/network/contacts/{id}',           [NetworkContactController::class, 'update']);
        Route::delete('/network/contacts/{id}',          [NetworkContactController::class, 'destroy']);

        // Communauté admin (tous les membres, vérifiés + non vérifiés)
        Route::get('/community/admin',                   [NetworkContactController::class, 'adminCommunity']);
    });
});
