package com.containertrack.config;

import com.containertrack.scheduler.NotificationScheduler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;

/**
 * Drives NotificationScheduler.run() off a dynamic Trigger instead of a fixed interval.
 * The Trigger just reads NotificationScheduler.getNextRunAt(), which run() itself
 * recomputes on every execution based on how close the nearest upcoming container date
 * actually is. See NotificationScheduler's class javadoc for why this replaced @Scheduled.
 */
@Configuration
@RequiredArgsConstructor
public class NotificationSchedulerConfig implements SchedulingConfigurer {

    private final NotificationScheduler notificationScheduler;

    @Override
    public void configureTasks(ScheduledTaskRegistrar registrar) {
        registrar.addTriggerTask(
                notificationScheduler::run,
                triggerContext -> notificationScheduler.getNextRunAt());
    }
}
