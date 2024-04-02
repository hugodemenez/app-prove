"use client"

import * as React from "react"
import { CalendarIcon } from "@radix-ui/react-icons"
import { addDays, format, subDays } from "date-fns"
import { DateRange } from "react-day-picker"

import { Calendar } from "@/components/ui/calendar"
import { zodResolver } from "@hookform/resolvers/zod"
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { cn } from "@/lib/utils"
import { redirect } from 'next/navigation'
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "@/components/ui/use-toast"
import { createClient } from "@/utils/supabase/clients"
import { Separator } from "@/components/ui/separator"

import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Command as CommandPrimitive } from "cmdk";


type Framework = Record<"value" | "label", string>;

const FRAMEWORKS = [
    {
        value: "next.js",
        label: "Next.js",
    },
    {
        value: "sveltekit",
        label: "SvelteKit",
    },
    {
        value: "nuxt.js",
        label: "Nuxt.js",
    },
    {
        value: "remix",
        label: "Remix",
    },
    {
        value: "astro",
        label: "Astro",
    },
    {
        value: "wordpress",
        label: "WordPress",
    },
    {
        value: "express.js",
        label: "Express.js",
    },
    {
        value: "nest.js",
        label: "Nest.js",
    }
] satisfies Framework[];
const FormSchema = z.object({
    url: z.string({
    }).url({ message: "Add a valid url" }),
    description: z.string({
        required_error: "Please add a description.",
    }),
    framework: z.string({
        required_error: "Please select a framework.",
    }),
    budget: z.string({
        required_error: "Please fill in the budget field.",
    }),
    date: z.custom<DateRange>((value) => {
        if (!value) return false
        if (typeof value !== "object") return false
        if (!("from" in value) || !("to" in value)) return false
        if (typeof value.to !== "object") return false
        if ((value.from as Date) < subDays(new Date(), 1)) return false
        return true
    }, { message: 'Please select a valid date.' }),
})


export default function PublishForm() {
    const [open, setOpen] = React.useState(false)

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            url: "https://test.io",
            description: "https://test.io",
            date: { from: new Date(), to: addDays(new Date(), 20) },
            framework: "next.js",
            budget: '123',
        },
    })

    function onSubmit(data: z.infer<typeof FormSchema>) {
        console.log(data)
        toast({
            title: "You submitted the following values:",
            description: (
                <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
                    <code className="text-white">{JSON.stringify(data, null, 2)}</code>
                </pre>
            ),
        })
    }

    function onError(errors: any) {
        console.log(errors)
    }
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [selected, setSelected] = React.useState<Framework[]>([FRAMEWORKS[4]]);
    const [inputValue, setInputValue] = React.useState("");

    const handleUnselect = React.useCallback((framework: Framework) => {
        setSelected(prev => prev.filter(s => s.value !== framework.value));
    }, []);

    const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        const input = inputRef.current
        if (input) {
            if (e.key === "Delete" || e.key === "Backspace") {
                if (input.value === "") {
                    setSelected(prev => {
                        const newSelected = [...prev];
                        newSelected.pop();
                        return newSelected;
                    })
                }
            }
            // This is not a default behaviour of the <input /> field
            if (e.key === "Escape") {
                input.blur();
            }
        }
    }, []);

    const selectables = FRAMEWORKS.filter(framework => !selected.includes(framework));


    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onError)} className="flex-1 flex flex-col gap-4">
                <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (<>
                        <FormItem className="grid w-full gap-1.5">
                            <FormLabel>Project url</FormLabel>
                            <div className='flex'>
                                <Input className='rounded-e-none w-fit' disabled type='text' id="domain" value="github.com/" />
                                <FormControl>
                                    <Input className='rounded-l-none' placeholder="" {...field} />
                                </FormControl>
                            </div>
                            <FormDescription>This is the github url of the project</FormDescription>
                            <FormMessage />

                        </FormItem>
                    </>)}
                />
                <Separator />
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <div className="grid w-full gap-1.5">
                            <FormLabel>Short description</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Explain what the auditor has to look at." id="message" {...field} />
                            </FormControl>
                            <FormDescription>This is a short description of the work you are looking for</FormDescription>
                            <FormMessage />
                        </div>
                    )}
                />
                <Separator />
                <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                        <div className="grid w-full gap-1.5">
                            <Label htmlFor="date">Auditing period</Label>
                            <FormControl>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="date"
                                            variant={"outline"}
                                            className={cn(
                                                "text-base w-[300px] justify-start text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {field.value?.from ? (
                                                field.value.to ? (
                                                    <>
                                                        {format(field.value.from, "LLL dd, y")} -{" "}
                                                        {format(field.value.to, "LLL dd, y")}
                                                    </>
                                                ) : (
                                                    format(field.value.from, "LLL dd, y")
                                                )
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={field.value?.from}
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            numberOfMonths={1}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </FormControl>
                            <FormDescription>This is the period you would like the audit to take place</FormDescription>
                            <FormMessage />
                        </div>

                    )}
                />

                <Separator />
                <FormField
                    control={form.control}
                    name="framework"
                    render={({ field }) => (
                        <div className="grid w-full gap-1.5">
                            <FormLabel>Framework</FormLabel>
                            <Command onKeyDown={handleKeyDown} className="overflow-visible bg-transparent">
                                <div
                                    className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                                >
                                    <div className="flex gap-1 flex-wrap">
                                        {selected.map((framework) => {
                                            return (
                                                <Badge key={framework.value} variant="secondary">
                                                    {framework.label}
                                                    <button
                                                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                handleUnselect(framework);
                                                            }
                                                        }}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                        }}
                                                        onClick={() => handleUnselect(framework)}
                                                    >
                                                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                                    </button>
                                                </Badge>
                                            )
                                        })}
                                        {/* Avoid having the "Search" Icon */}
                                        <CommandPrimitive.Input
                                            ref={inputRef}
                                            value={inputValue}
                                            onValueChange={setInputValue}
                                            onBlur={() => setOpen(false)}
                                            onFocus={() => setOpen(true)}
                                            placeholder="Select frameworks..."
                                            className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1"
                                        />
                                    </div>
                                </div>
                                <div className="relative mt-2">
                                    {open && selectables.length > 0 ?
                                        <div className="absolute w-full z-10 top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
                                            <CommandList>
                                                <CommandGroup className="h-full overflow-auto">
                                                    {selectables.map((framework) => {
                                                        return (
                                                            <CommandItem
                                                                key={framework.value}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                }}
                                                                onSelect={(value) => {
                                                                    setInputValue("")
                                                                    setSelected(prev => [...prev, framework])
                                                                }}
                                                                className={"cursor-pointer"}
                                                            >
                                                                {framework.label}
                                                            </CommandItem>
                                                        );
                                                    })}
                                                </CommandGroup>
                                            </CommandList>
                                        </div>
                                        : null}
                                </div>
                            </Command >
                            <FormDescription>This is the framework your code is written with</FormDescription>
                            <FormMessage />
                        </div>
                    )}
                />
                <Separator />
                <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                        <div className="grid w-full gap-1.5">
                            <FormLabel>Budget</FormLabel>
                            <FormControl>
                                <Input className="self-start " type='number' id="budget" placeholder="how much are you willing to spend?" {...field} />
                            </FormControl>
                            <FormDescription>This is the budget you are willing to spend for the audit</FormDescription>
                            <FormMessage />
                        </div>
                    )}
                />
                <Button className='self-end' type="submit">Proceed to payment</Button>
            </form>
        </Form>
    )
}
