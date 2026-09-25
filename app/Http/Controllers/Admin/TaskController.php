<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminTask;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'due_date' => ['nullable', 'date'],
        ]);

        $task = new AdminTask($data);
        $task->user_id = $request->user()->id;
        $task->save();

        return redirect()->route('admin.dashboard')->with('status', 'Task added.');
    }

    public function update(Request $request, AdminTask $adminTask): RedirectResponse
    {
        $this->ensureOwner($request, $adminTask);
        $data = $request->validate(['completed' => ['required', 'boolean']]);
        $adminTask->update($data);

        return redirect()->route('admin.dashboard')->with('status', $adminTask->completed ? 'Task completed.' : 'Task reopened.');
    }

    public function destroy(Request $request, AdminTask $adminTask): RedirectResponse
    {
        $this->ensureOwner($request, $adminTask);
        $adminTask->delete();

        return redirect()->route('admin.dashboard')->with('status', 'Task deleted.');
    }

    private function ensureOwner(Request $request, AdminTask $adminTask): void
    {
        abort_unless($adminTask->user_id === $request->user()->id, 404);
    }
}
