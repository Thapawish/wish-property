<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lease;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LeaseController extends Controller
{
    public function index(Request $request)
    {
        $query = Lease::where('agency_id', $request->get('agency_id'))
            ->with(['property', 'tenant']);

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        if ($request->get('date_from')) {
            $query->where('end_date', '>=', $request->get('date_from'));
        }

        if ($request->get('date_to')) {
            $query->where('start_date', '<=', $request->get('date_to'));
        }

        if ($search = $request->get('search')) {
            $query->whereHas('property', function ($q) use ($search) {
                $q->where('address', 'ilike', "%{$search}%")
                  ->orWhere('suburb', 'ilike', "%{$search}%");
            })->orWhereHas('tenant', function ($q) use ($search) {
                $q->where('first_name', 'ilike', "%{$search}%")
                  ->orWhere('last_name', 'ilike', "%{$search}%");
            });
        }

        return response()->json($query->orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules());

        $lease = Lease::create($data);

        return response()->json($lease->load(['property', 'tenant']), 201);
    }

    public function show(Lease $lease)
    {
        return response()->json($lease->load(['property', 'tenant']));
    }

    public function update(Request $request, Lease $lease)
    {
        $data = $request->validate($this->rules());

        $lease->update($data);

        return response()->json($lease->load(['property', 'tenant']));
    }

    public function destroy(Lease $lease)
    {
        $lease->delete();

        return response()->json(null, 204);
    }

    private function rules(): array
    {
        return [
            'agency_id' => 'required|uuid|exists:agencies,id',
            'property_id' => 'required|uuid|exists:properties,id',
            'tenant_id' => 'nullable|uuid|exists:contacts,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'rent_amount' => 'required|numeric|min:0',
            'bond_amount' => 'nullable|numeric|min:0',
            'status' => ['required', Rule::in(['active', 'expired', 'pending'])],
            'payment_frequency' => ['sometimes', Rule::in(['weekly', 'fortnightly', 'monthly'])],
            'first_payment_date' => 'nullable|date',
            'paid_until' => 'nullable|date',
            'next_inspection_months' => 'nullable|integer|min:0',
            'next_rent_review_months' => 'nullable|integer|min:0',
            'gst_included' => 'boolean',
            'tenant_pays_water' => 'boolean',
            'is_periodic' => 'boolean',
            'internal_notes' => 'nullable|string',
        ];
    }
}
