# Implementation plan

Reid Chiropractic booking page. These changes are in the site files in this repository.

## Conversion

1. The hero shows the next open first visit and its price. The booking button names that time.
2. The booker is on the first screen: visit type, three open times, name, and one contact.
3. The form requires a name and either an email or a phone. The reason is a tap: desk pain, training, or a straight recommendation.
4. The mobile bar names the next open time.
5. The line at the button says the visit is treated the same day and no package is sold at the door.

## Dynamic

6. Each "who books" card selects that reason and opens the booker with it filled in.
7. The summary updates the length and price as the visit, day, and time change.
8. A first visit needs a clear 45 minutes. A follow-up needs 25. A longer visit closes the overlapping time.
9. A confirmed booking closes that time, and the hero's next open time moves forward.
10. An unfinished day, time, and reason stay in place if the page is reloaded.
