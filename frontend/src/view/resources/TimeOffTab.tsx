import { currentSpans } from '@/data/resource'
import type { PersonLoad } from '@/data/resource'
import type { Holiday, TimeOff } from '@/types'
import HolidayForm from './HolidayForm'
import HolidayRow from './HolidayRow'
import TimeOffForm from './TimeOffForm'
import TimeOffRow from './TimeOffRow'

type TimeOffTabProps = {
  people: PersonLoad[]
  timeOffs: TimeOff[]
  holidays: Holiday[]
  // The Monday of the first week shown: leave and holidays that finished
  // before it are hidden.
  firstWeek: string
  canManage: boolean
  today: string
}

// The Space's holidays and everyone's leave, which lower capacity on the
// People tab: a day is a fifth of the working week (Monday to Friday).
export default function TimeOffTab({ people, timeOffs, holidays, firstWeek, canManage, today }: TimeOffTabProps) {
  const upcomingHolidays = currentSpans(holidays, firstWeek)
  const upcomingTimeOffs = currentSpans(timeOffs, firstWeek)
  const personName = (userId: number) => people.find((p) => p.userId === userId)?.name ?? 'Former member'

  return (
    <>
      <section className="resources-card" aria-labelledby="resources-holidays">
        <div className="resources-card-top">
          <h2 id="resources-holidays" className="resources-card-title">Holidays</h2>
          <span className="resources-card-meta">Off for everyone in the Space</span>
        </div>
        {upcomingHolidays.length > 0 ? (
          <ul className="resources-spans" aria-label="Holidays">
            {upcomingHolidays.map((holiday) => <HolidayRow key={holiday.id} holiday={holiday} canManage={canManage} />)}
          </ul>
        ) : (
          <p className="resources-hint">No holidays in these weeks.</p>
        )}
        {canManage && <HolidayForm today={today} />}
      </section>

      <section className="resources-card" aria-labelledby="resources-time-off">
        <div className="resources-card-top">
          <h2 id="resources-time-off" className="resources-card-title">Time off</h2>
          <span className="resources-card-meta">Leave lowers capacity for that person</span>
        </div>
        {upcomingTimeOffs.length > 0 ? (
          <ul className="resources-spans" aria-label="Time off">
            {upcomingTimeOffs.map((timeOff) => <TimeOffRow key={timeOff.id} timeOff={timeOff} person={personName(timeOff.user_id)} canManage={canManage} />)}
          </ul>
        ) : (
          <p className="resources-hint">No one has time off in these weeks.</p>
        )}
        {canManage && <TimeOffForm people={people} today={today} />}
      </section>
    </>
  )
}
