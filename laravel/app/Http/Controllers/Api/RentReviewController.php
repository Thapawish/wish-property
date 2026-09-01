<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RentReview;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RentReviewController extends Controller
{
    public function index(Request $request)
    {
        $query = RentReview::where('agency_id', $request->get('agency_id'))
            ->with('lease.property');

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        return response()->json($query->orderBy('review_date', 'desc')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'agency_id' => 'required|uuid|exists:agencies,id',
            'lease_id' => 'required|uuid|exists:leases,id',
            'review_date' => 'required|date',
            'current_rent' => 'required|numeric|min:0',
            'proposed_rent' => 'required|numeric|min:0',
            'approved_rent' => 'nullable|numeric|min:0',
            'status' => ['required', Rule::in(['pending', 'approved', 'rejected', 'applied'])],
            'notes' => 'nullable|string',
        ]);

        $review = RentReview::create($data);

        return response()->json($review->load('lease.property'), 201);
    }

    public function show(RentReview $rentReview)
    {
        return response()->json($rentReview->load('lease.property'));
    }

    public function update(Request $request, RentReview $rentReview)
    {
        $data = $request->validate([
            'review_date' => 'sometimes|date',
            'current_rent' => 'sometimes|numeric|min:0',
            'proposed_rent' => 'sometimes|numeric|min:0',
            'approved_rent' => 'nullable|numeric|min:0',
            'status' => ['sometimes', Rule::in(['pending', 'approved', 'rejected', 'applied'])],
            'notes' => 'nullable|string',
        ]);

        $rentReview->update($data);

        return response()->json($rentReview->load('lease.property'));
    }

    public function destroy(RentReview $rentReview)
    {
        $rentReview->delete();

        return response()->json(null, 204);
    }
}
