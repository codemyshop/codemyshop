/**
 */

export type EventType   = 'physique' | 'online'
export type EventStatus = 'draft' | 'published' | 'cancelled'

export interface EventRecord {
  id:            string
  title:         string
  description:   string
  date:          string          // ISO 8601
  endDate?:      string
  type:          EventType
  capacity:      number          // 0 = illimité
  registrations: number          // compteur dénormalisé
  status:        EventStatus
  location?:     string
  meetingUrl?:   string
  coverImage?:   string
  clientId?:     string          // namespace white-label
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
