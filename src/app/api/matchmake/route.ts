import { createClient } from '@/utils/supabase/server'
import { runMatchmaking } from '@/utils/matchmaking'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { roundId } = await request.json()

    if (!roundId) {
        return NextResponse.json({ error: 'Missing roundId' }, { status: 400 })
    }

    try {
        const count = await runMatchmaking(roundId)
        return NextResponse.json({ success: true, matchesCreated: count })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
