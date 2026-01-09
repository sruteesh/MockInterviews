export const dynamic = 'force-dynamic'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AvailabilityForm from './availability-form'
import LogoutButton from '@/components/logout-button'

export default async function AvailabilityPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: activeRound } = await supabase
        .from('rounds')
        .select('*')
        .eq('is_active', true)
        .single()

    if (!activeRound) {
        return (
            <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
                <div className="bg-white shadow rounded-lg p-8 text-center max-w-md">
                    <h3 className="text-lg font-medium text-gray-900">No active round</h3>
                    <p className="mt-2 text-gray-500">There are no mock interview rounds currently active. Please check back later.</p>
                    <a href="/dashboard" className="mt-4 inline-block text-indigo-600 hover:text-indigo-500">Back to Dashboard</a>
                </div>
            </div>
        )
    }

    const { data: timeSlots } = await supabase
        .from('time_slots')
        .select('*')
        .eq('round_id', activeRound.id)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

    const { data: availabilities } = await supabase
        .from('availabilities')
        .select(`
      *,
      availability_slots(time_slot_id)
    `)
        .eq('user_id', user.id)
        .eq('round_id', activeRound.id)

    // Get all slot IDs where user has availability in either role
    const userSlotIds = new Set<string>()
    availabilities?.forEach(avail => {
        avail.availability_slots?.forEach((slot: any) => {
            userSlotIds.add(slot.time_slot_id)
        })
    })

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-3xl mx-auto">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Manage Availability</h1>
                        <p className="text-gray-600 mt-1">{activeRound.name}</p>
                    </div>
                    <a href="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-500">
                        Back to Dashboard
                    </a>
                </header>

                <AvailabilityForm
                    roundId={activeRound.id}
                    userId={user.id}
                    timeSlots={timeSlots || []}
                    initialAvailabilities={availabilities || []}
                    occupiedSlotIds={Array.from(userSlotIds)}
                />
            </div>
        </div>
    )
}
