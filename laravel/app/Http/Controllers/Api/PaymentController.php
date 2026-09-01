<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        $query = Payment::where('agency_id', $request->get('agency_id'))
            ->with('lease.property');

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        if ($request->get('date_from')) {
            $query->where('due_date', '>=', $request->get('date_from'));
        }

        if ($request->get('date_to')) {
            $query->where('due_date', '<=', $request->get('date_to'));
        }

        return response()->json($query->orderBy('due_date', 'desc')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'agency_id' => 'required|uuid|exists:agencies,id',
            'lease_id' => 'required|uuid|exists:leases,id',
            'amount' => 'required|numeric|min:0',
            'due_date' => 'required|date',
            'paid_date' => 'nullable|date',
            'status' => ['required', Rule::in(['pending', 'paid', 'overdue'])],
            'method' => 'nullable|string|max:255',
            'reference' => 'nullable|string|max:255',
        ]);

        $payment = Payment::create($data);

        return response()->json($payment->load('lease.property'), 201);
    }

    public function show(Payment $payment)
    {
        return response()->json($payment->load('lease.property'));
    }

    public function update(Request $request, Payment $payment)
    {
        $data = $request->validate([
            'amount' => 'sometimes|numeric|min:0',
            'due_date' => 'sometimes|date',
            'paid_date' => 'nullable|date',
            'status' => ['sometimes', Rule::in(['pending', 'paid', 'overdue'])],
            'method' => 'nullable|string|max:255',
            'reference' => 'nullable|string|max:255',
        ]);

        $payment->update($data);

        return response()->json($payment->load('lease.property'));
    }

    public function destroy(Payment $payment)
    {
        $payment->delete();

        return response()->json(null, 204);
    }
}
