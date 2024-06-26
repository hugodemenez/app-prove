'use client'
import { useCallback, useState } from "react"
import { Button } from "./ui/button"
import { createClient } from "@/utils/supabase/clients"
import { revalidatePath } from "next/cache"
import { User } from "@supabase/supabase-js"
import { Toast } from "./ui/toast"
import { toast } from "sonner"
import { Toaster } from "./ui/sonner"

export function ParticipateButton({ user, participants, offerID }: { user: User, participants: string[], offerID: number }) {
    const [participating, setParticipating] = useState(participants?.includes(user.user_metadata.full_name))
    const participate = useCallback(async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        // upload to db
        // Check if user exists
        if (!user) {
            toast('User not found please log in')
            return
        }
        if (participants) {
            participants.push(user.user_metadata.full_name)
        }
        else {
            participants = [user.user_metadata.full_name]
        }
        const { data: result, error } = await supabase.from('offers').update({ participants: participants }).eq('id', offerID).select()
        if (error) {
            console.log(error)
            return
        }
        setParticipating(true)
            toast('Participation registered')
    }, [participants]) // Add an empty array as the second argument
    const cancelParticipation = useCallback(async () => {
        // Client side
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        // upload to db
        // Check if user exists
        if (!user) {
            toast('User not found please log in')
            return
        }
        const index = participants.indexOf(user.user_metadata.full_name)
        if (index > -1) {
            participants.splice(index, 1)
        }
        const { data: result, error } = await supabase.from('offers').update({ participants: participants }).eq('id', offerID).select()
        if (error) {
            console.log(error)
            return
        }


        toast('Cancelled participation')
        setParticipating(false)
    }
        , [offerID,participants]) // Add an empty array as the second argument
    return (
        <>
            <Toaster></Toaster>
            {participating ?
                <Button onClick={() => { cancelParticipation() }} variant={'secondary'}>Cancel participation</Button>
                :
                <Button onClick={() => { participate() }}>Participate</Button>
            }
        </>
    )
}
