

export type EventType   = 'physique' | 'online'
export type EventStatus = 'draft' | 'published' | 'cancelled'

export interface EventRecord {
  id:            string
  title:         string
  description:   string
  date:          string          
  endDate?:      string
  type:          EventType
  capacity:      number          
  registrations: number          
  status:        EventStatus
  location?:     string
  meetingUrl?:   string
  coverImage?:   string
  clientId?:     string          
  createdAt:     string
}

export interface EventRegistration {
  id:        string
  eventId:   string
  name:      string
  email:     string
  phone?:    string
  createdAt: string
}
