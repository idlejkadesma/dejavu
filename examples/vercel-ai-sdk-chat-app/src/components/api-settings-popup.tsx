import { Dispatch, SetStateAction, useContext, useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import GlobalContext from '@/contexts/GlobalContext'
import { Provider } from '@/constants/messages'
export default function ApiSettingsPopup(props: { isOpen: boolean, setIsOpen: Dispatch<SetStateAction<boolean>> }) {
  const {isOpen, setIsOpen} = props
  const [dejavuApiKey, setDeja VuApiKey] = useState('')
  const [providerApiKey, setProviderApiKey] = useState('')
  const [provider, setProvider] = useState('OpenAI')
  const { selectorHandler, selectedOpenAIKey, selectedDeja VuKey, selectedProvider } = useContext(GlobalContext);

  const handleSave = () => {
    // Here you would typically save the settings to your backend or local storage
    selectorHandler(dejavuApiKey, providerApiKey, provider as Provider);
    setIsOpen(false)
  }

  useEffect(() => {
    if (selectedOpenAIKey) {
      setProviderApiKey(selectedOpenAIKey);
    }
    if (selectedDeja VuKey) {
      setDeja VuApiKey(selectedDeja VuKey);
    }
    if (selectedProvider) {
      setProvider(selectedProvider);
    }
  }, [selectedOpenAIKey, selectedDeja VuKey, selectedProvider]);
  


  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>API Configuration Settings</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dejavu-api-key" className="text-right">
                Deja Vu API Key
              </Label>
              <Input
                id="dejavu-api-key"
                value={dejavuApiKey}
                onChange={(e) => setDeja VuApiKey(e.target.value)}
                className="col-span-3 rounded-3xl"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="provider-api-key" className="text-right">
                Provider API Key
              </Label>
              <Input
                id="provider-api-key"
                value={providerApiKey}
                onChange={(e) => setProviderApiKey(e.target.value)}
                className="col-span-3 rounded-3xl"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="provider" className="text-right">
                Provider
              </Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger className="col-span-3 rounded-3xl">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent className='rounded-3xl'>
                  <SelectItem value="openai" className='rounded-3xl'>OpenAI</SelectItem>
                  <SelectItem value="anthropic" className='rounded-3xl'>Anthropic</SelectItem>
                  <SelectItem value="cohere" className='rounded-3xl'>Cohere</SelectItem>
                  <SelectItem value="groq" className='rounded-3xl'>Groq</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button className='rounded-3xl' variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button className='rounded-3xl' onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}