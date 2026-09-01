<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Property;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PropertyController extends Controller
{
    public function index(Request $request)
    {
        $query = Property::where('agency_id', $request->get('agency_id'))
            ->with('landlord');

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        if ($suburb = $request->get('suburb')) {
            $query->where('suburb', $suburb);
        }

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('address', 'ilike', "%{$search}%")
                  ->orWhere('suburb', 'ilike', "%{$search}%")
                  ->orWhere('state', 'ilike', "%{$search}%")
                  ->orWhere('postcode', 'ilike', "%{$search}%")
                  ->orWhere('property_type', 'ilike', "%{$search}%");
            });
        }

        return response()->json($query->orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules());

        $property = Property::create($data);

        return response()->json($property->load('landlord'), 201);
    }

    public function show(Property $property)
    {
        return response()->json($property->load('landlord'));
    }

    public function update(Request $request, Property $property)
    {
        $data = $request->validate($this->rules($property->id));

        $property->update($data);

        return response()->json($property->load('landlord'));
    }

    public function destroy(Property $property)
    {
        $property->delete();

        return response()->json(null, 204);
    }

    private function rules(string $id = ''): array
    {
        return [
            'agency_id' => 'required|uuid|exists:agencies,id',
            'address' => 'required|string|max:500',
            'suburb' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:50',
            'postcode' => 'nullable|string|max:20',
            'property_type' => ['required', Rule::in(['house', 'apartment', 'townhouse', 'unit', 'land'])],
            'status' => ['required', Rule::in(['leased', 'vacant', 'pending'])],
            'bedrooms' => 'required|integer|min:0',
            'bathrooms' => 'required|integer|min:0',
            'parking' => 'required|integer|min:0',
            'landlord_id' => 'nullable|uuid|exists:contacts,id',
            'management_gained_reason' => 'nullable|string|max:255',
            'gained_reason_source' => 'nullable|string|max:255',
            'property_category' => 'nullable|string|max:255',
            'property_aspect' => 'nullable|string|max:255',
            'has_aircon' => 'boolean',
            'has_garden' => 'boolean',
            'has_built_ins' => 'boolean',
            'has_internal_laundry' => 'boolean',
            'has_balcony' => 'boolean',
            'has_gas_cooking' => 'boolean',
            'has_electric_cooking' => 'boolean',
            'has_dishwasher' => 'boolean',
            'has_stairs' => 'boolean',
            'has_lift' => 'boolean',
            'ownership_type' => 'nullable|string|max:255',
            'split_payments' => 'boolean',
            'owner_first_name' => 'nullable|string|max:255',
            'owner_last_name' => 'nullable|string|max:255',
            'owner_email' => 'nullable|email|max:255',
            'owner_mobile' => 'nullable|string|max:50',
            'management_fee_percent' => 'nullable|numeric|min:0|max:100',
            'letting_fee' => 'nullable|numeric|min:0',
            'lease_renewal_fee' => 'nullable|numeric|min:0',
            'advertising_fee' => 'nullable|numeric|min:0',
            'approved_maintenance_spend' => 'nullable|numeric|min:0',
            'admin_fee' => 'nullable|numeric|min:0',
            'admin_fee_charge_date' => 'nullable|string|max:255',
            'do_not_charge_admin_fee_if_vacant' => 'boolean',
        ];
    }
}
