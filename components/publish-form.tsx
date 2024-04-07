"use client"

import * as React from "react"
import { BellIcon, CalendarIcon, ReloadIcon } from "@radix-ui/react-icons"
import { addDays, format, set, subDays } from "date-fns"
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
import { toast as sonner } from "sonner"

import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandShortcut,
} from "@/components/ui/command"
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Command as CommandPrimitive } from "cmdk";
import { createPayment, publishNewKeyword, registerOffer, updateOffer } from "@/app/publish/actions"
import { CheckoutForm } from "./checkout"
import CurrencyInput from 'react-currency-input-field';
import { useCallback, useEffect, useRef, useState } from "react"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { ScrollArea } from "./ui/scroll-area"
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"


const FormSchema = z.object({
    url: z.string().superRefine((value, ctx) => {
        if (value === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "You forgot to add a repo",
            });
        }
        // Check if repo value is accessible through github
    }
    ),
    description: z.string().superRefine((
        (value, ctx) => {
            if (value === '') ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Please add a description",
            });
        }),
    ),
    budget: z.string().superRefine((value, ctx) => {
        if (value === '') ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Please add a budget",
        });
        if (Number(value) > 20000) ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Please choose a reasonable budget",
        });

    }),
    date: z.custom<DateRange>((value) => {
        if (!value) return false
        if (typeof value !== "object") return false
        if (!("from" in value) || !("to" in value)) return false
        if ((value.from as Date) < subDays(new Date(), 1)) return false
        if (!['object', 'string'].includes(typeof value.from) || !['object', 'string'].includes(typeof value.to)) return false
        if ((value.to as Date) < subDays(new Date(), 1)) return false
        return true
    }, { message: 'Please select a valid date.' }),
    keywords: z.custom<Keyword[]>((value) => {
        if (!value) return false
        if (typeof value !== "object" || !Array.isArray(value)) return false;
        // check if there is at least one element
        if (value.length === 0) return false
        return true
    }, { message: 'Please select at least one keyword.' }),
})


export default function PublishForm({ keywords }: { keywords: Keyword[] }) {
    const [open, setOpen] = React.useState(false)
    const [processing, setProcessing] = React.useState(false)
    const [selected, setSelected] = React.useState<Keyword[]>([]);
    const [inputValue, setInputValue] = React.useState("");
    const [error, setError] = React.useState<string | undefined>();
    const selectables = keywords.filter(keyword => !selected.includes(keyword));
    const inputRef = React.useRef<HTMLInputElement>(null);
    const inputValueRef = useRef<string | undefined>();
    const [repositories, setRepositories] = React.useState<Repository[]>([])

    // Load initial state from localStorage
    const getInitialState = <T extends unknown>(key: string, defaultValue: T): T => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(key);
            if (saved) {
                if (saved === 'undefined') return defaultValue
                return JSON.parse(saved);
            }
        }
        return defaultValue;
    };
    // Save state to localStorage
    const useLocalStorage = <T extends unknown>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
        const [storedValue, setStoredValue] = useState<T>(() => getInitialState(key, initialValue));

        const setValue = (value: T | ((val: T) => T)) => {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            if (typeof window !== 'undefined') {
                localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        };

        return [storedValue, setValue];
    };

    const [selectedKeywords, setSelectedKeywords] = useLocalStorage<Keyword[]>('selectedKeywords', []);
    const [budget, setBudget] = useLocalStorage<string>('budget', "");
    const [url, setUrl] = useLocalStorage<string>('url', "");
    const [description, setDescription] = useLocalStorage<string>('description', "");
    const [date, setDate] = useLocalStorage<DateRange>('date', { from: undefined, to: undefined });
    const [id, setId] = useLocalStorage<number>('id', 0)

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            url: url,
            description: description,
            budget: budget,
            keywords: selectedKeywords,
            date: date,
        }
    })
    const loadGithubProjects = useCallback(async () => {
        const supabase = createClient()
        const { data: userData, error } = await supabase.auth.getUser()
        const response = await fetch(`https://api.github.com/users/${userData.user?.user_metadata.user_name}/repos`)
        const data = await response.json()
        if (data.error) {
            setError(data.error)
            return
        }
        setRepositories(data.map((project: Repository) => project as Repository))
    }, []);

    useEffect(() => {
        loadGithubProjects();
    }, [loadGithubProjects]);

    // const loadGithubProjects = async () => {
    //     const supabase = createClient()
    //     const {data:userData,error} = await supabase.auth.getUser()
    //     const response = await fetch(`https://api.github.com/users/${userData.user?.user_metadata.user_name}/repos`)
    //     const data = await response.json()
    //     if (data.error) {
    //         setError(data.error)
    //         return
    //     }
    //     setProjects(data.map((project: Repository) => project))
    // }
    // loadGithubProjects()

    function saveState(data: { url: string; description: string; budget: string; date: DateRange; keywords: Keyword[] }) {
        setUrl(data.url)
        setDescription(data.description)
        setBudget(data.budget)
        setDate(data.date)
        setSelectedKeywords(data.keywords)
    }
    function onSubmit(data: z.infer<typeof FormSchema>) {
        setProcessing(true)
        // save all data in states
        saveState(data)
        // Check if there is db entry (id in localStorage)
        console.log('ID before', localStorage.getItem('id'))
        if (Number(localStorage.getItem('id')) !== 0) {
            console.log('test')
            const updateNewOffer = async () => {
                const { data: loadId, error } = await updateOffer(id, {
                    ...data,
                    date: {
                        from: data.date?.from,
                        to: data.date?.to || new Date() // Provide a default value if 'to' is not defined
                    }
                });
                console.log(error)
                if (error) {
                    setError('An error occured while updating the offer: ' + error.message)
                    return
                }
                setId(loadId)
                createPayment(data)
            }
            updateNewOffer();
            if (error)
                sonner('An error occured while updating the offer')
            localStorage.clear()
            console.log('ID after update', id);
        }
        else {
            console.log('THERE IS NOTHIBNG')
            const registerNewOffer = async () => {
                const { data: loadId, error } = await registerOffer({
                    ...data,
                    date: {
                        from: data.date?.from,
                        to: data.date?.to || new Date() // Provide a default value if 'to' is not defined
                    }
                });
                setId(loadId)
                createPayment(data)
            }
            registerNewOffer();
            console.log('ID after creation', id);
        }
        // If there isn't create a new entry
        // If there is update the entry
    }

    function onError(errors: any) {
        console.log(errors)
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onError)} className="flex-1 flex flex-col gap-4">
                <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (<>
                        <FormItem className="grid w-full gap-1.5">
                            <FormLabel>Project url</FormLabel>
                            <div className='flex flex-1 flex-wrap gap-x-4'>
                                <FormControl className="flex-1 ">
                                    <ScrollArea className="h-72 w-48 rounded-md border">
                                        <div className="p-4">
                                            <h4 className="mb-4 text-sm font-medium leading-none">Repositories</h4>
                                            <RadioGroup
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                            >
                                                {repositories.map((repository) => (
                                                    <>
                                                        <div className="flex items-center space-x-2">
                                                            <RadioGroupItem value={repository.full_name} id={repository.full_name} />
                                                            <Label htmlFor={repository.full_name}>{repository.full_name}</Label>
                                                        </div>
                                                        <Separator className="my-2" />
                                                    </>
                                                ))}
                                            </RadioGroup>
                                        </div>
                                    </ScrollArea>
                                </FormControl>
                            </div>
                            <FormDescription>This is the github url of the project</FormDescription>
                            <FormMessage />

                        </FormItem>
                    </>)}
                />
                {/* <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (<>
                        <FormItem className="grid w-full gap-1.5">
                            <FormLabel>Project url</FormLabel>
                            <div className='flex'>
                                <Input className='rounded-r-none border-r-0 placeholder:text-muted-foreground max-w-fit w-[125px]' disabled type='text' id="domain" placeholder="github.com/" />
                                <FormControl className="flex-1">
                                    <Input className='flex-1 rounded-l-none' id="url" placeholder="name of organisation" {...field} />
                                </FormControl>
                            </div>
                            <FormDescription>This is the github url of the project</FormDescription>
                            <FormMessage />

                        </FormItem>
                    </>)}
                /> */}
                <Separator />
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <div className="grid w-full gap-1.5">
                            <FormLabel>Short description</FormLabel>
                            <FormControl >
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
                                                <span
                                                    className="text-muted-foreground text-base"
                                                >Pick a date</span>
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
                    name="keywords"
                    render={({ field }) => (
                        <div className="grid w-full gap-1.5">
                            <FormLabel>Keyword</FormLabel>
                            <FormItem>
                                <FormControl>
                                    <Command onKeyDown={async (e) => {
                                        const input = inputRef.current
                                        if (input) {
                                            if (e.key === "Delete" || e.key === "Backspace") {
                                                // If we want to delete the last keyword
                                                if (input.value === "") {
                                                    // Remove the last keyword from selected
                                                    setSelected(prev => {
                                                        const newSelected = [...prev];
                                                        newSelected.pop();
                                                        return newSelected;
                                                    })
                                                    // Remove the last keyword from the form
                                                    if (field.value && field.value.length > 0) {
                                                        form.setValue("keywords", field.value.slice(0, -1));
                                                    }
                                                }
                                            }
                                            // This is not a default behaviour of the <input /> field
                                            if (e.key === "Escape") {
                                                input.blur();
                                            }
                                            // If we want to add a new keyword
                                            if (e.key === "Spacebar" || e.key === " ") {
                                                if (inputValue.trim() === "") {
                                                    return;
                                                }
                                                // Remove the space from the input value
                                                setInputValue(inputValue.trim());
                                                inputValueRef.current = inputValue.trim();
                                                // Server action to publish new keyword
                                                const { data, error } = await publishNewKeyword(inputValueRef.current)
                                                if (error) {
                                                    toast({
                                                        title: "Error",
                                                        description: "An error occured while adding the keyword " + error.message,
                                                    })
                                                    return
                                                }
                                                toast({
                                                    title: "Keyword added",
                                                    description: "The keyword has been added to the list",
                                                })
                                                const newKeyword = { value: inputValueRef.current?.toLowerCase(), label: inputValueRef.current }
                                                // Add it to the list of possibilities
                                                keywords.push(newKeyword)
                                                // Add it to the list of selected keywords
                                                setSelected(prev => [...prev, newKeyword])
                                                form.setValue("keywords", [...field.value, newKeyword])
                                                setInputValue("")
                                                // Don't take the space into consideration
                                                e.preventDefault();
                                            }
                                        }
                                        // What happens if there is nothing in selectables?
                                        console.log('selectables', selectables)
                                    }
                                    }
                                        className="overflow-visible bg-transparent">
                                        <div
                                            className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                                        >
                                            <div className="flex gap-1 flex-wrap">
                                                {
                                                    // This is the list of selected keywords
                                                    // Displays a badge for each keyword
                                                    // Can't be undefined
                                                    field.value.map((keyword) => {
                                                        return (
                                                            <Badge key={keyword.value} variant="secondary">
                                                                {keyword.label}
                                                                <button
                                                                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter") {
                                                                            setSelected(prev => prev.filter(s => s.value !== keyword.value));
                                                                            form.setValue("keywords", field.value.filter(f => f.value !== keyword.value));
                                                                        }
                                                                    }}
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                    }}
                                                                    onClick={() => {
                                                                        setSelected(prev => prev.filter(s => s.value !== keyword.value));
                                                                        form.setValue("keywords", field.value.filter(f => f.value !== keyword.value));
                                                                    }
                                                                    }
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
                                                    placeholder="Select keywords..."
                                                    className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1 text-base"
                                                />
                                            </div>
                                        </div>
                                        <div className="relative mt-2">
                                            {open ?
                                                <div className="absolute w-full z-10 top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
                                                    <CommandList>
                                                        <CommandEmpty>No results found. Press <CommandShortcut>spacebar</CommandShortcut> to add new</CommandEmpty>
                                                        {
                                                            selectables.length > 0 ?
                                                                <CommandGroup className="h-full overflow-auto">
                                                                    {
                                                                        // This is the list of keywords that can be selected
                                                                        selectables.map((keyword) => {
                                                                            return (
                                                                                <CommandItem
                                                                                    key={keyword.value}
                                                                                    onMouseDown={(e) => {
                                                                                        e.preventDefault();
                                                                                        e.stopPropagation();
                                                                                    }}
                                                                                    onSelect={(value) => {
                                                                                        setInputValue("")
                                                                                        setSelected(prev => [...prev, keyword])
                                                                                        form.setValue("keywords", [...field.value, keyword])
                                                                                    }}
                                                                                    className={"cursor-pointer"}
                                                                                >
                                                                                    {keyword.label}
                                                                                </CommandItem>
                                                                            );
                                                                        })}
                                                                </CommandGroup>
                                                                :
                                                                null
                                                        }
                                                    </CommandList>
                                                </div>
                                                : null}
                                        </div>
                                    </Command >
                                </FormControl>
                            </FormItem>
                            <FormDescription>Choose keywords which define your project best</FormDescription>
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
                                <CurrencyInput
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50k text-base"
                                    id="budget"
                                    value={field.value ?? ''}
                                    placeholder="Define your budget"
                                    decimalsLimit={2}
                                    onValueChange={(value, name, values) => { console.log(value); form.setValue('budget', value ?? ''); setBudget(value ?? '') }}
                                    prefix="$"
                                />
                            </FormControl>
                            <FormDescription>This is the budget you are willing to spend for the audit</FormDescription>
                            <FormMessage />
                        </div>
                    )}
                />
                <Button
                    className='self-end'
                    type="submit"
                    disabled={processing}
                >
                    {!processing ?

                        <>Proceed payment</>
                        :
                        <>
                            <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                            <p>Please wait</p>
                        </>
                    }
                </Button>
            </form>
        </Form>
    )
}

