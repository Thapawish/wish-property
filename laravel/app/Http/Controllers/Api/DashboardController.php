<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Models\Lease;
use App\Models\Payment;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function stats(Request $request)
    {
        $agencyId = $request->get('agency_id');

        $totalProperties = Property::where('agency_id', $agencyId)->count();
        $leasedProperties = Property::where('agency_id', $agencyId)->where('status', 'leased')->count();
        $vacantProperties = Property::where('agency_id', $agencyId)->where('status', 'vacant')->count();

        $activeLeases = Lease::where('agency_id', $agencyId)->where('status', 'active')->count();

        $pendingPayments = Payment::where('agency_id', $agencyId)->where('status', 'pending')->count();
        $overduePayments = Payment::where('agency_id', $agencyId)->where('status', 'overdue')->count();
        $paidThisMonth = Payment::where('agency_id', $agencyId)
            ->where('status', 'paid')
            ->whereMonth('paid_date', now()->month)
            ->sum('amount');

        $totalRent = Lease::where('agency_id', $agencyId)
            ->where('status', 'active')
            ->sum('rent_amount');

        return response()->json([
            'properties' => [
                'total' => $totalProperties,
                'leased' => $leasedProperties,
                'vacant' => $vacantProperties,
            ],
            'leases' => [
                'active' => $activeLeases,
            ],
            'payments' => [
                'pending' => $pendingPayments,
                'overdue' => $overduePayments,
                'paid_this_month' => $paidThisMonth,
            ],
            'total_monthly_rent' => $totalRent,
        ]);
    }
}
