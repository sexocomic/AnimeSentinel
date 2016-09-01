<?php

function queueJob($job, $queue = 'default') {
  // Prepare job data
  $job_data = $job->db_data;
  unset($job->db_data);

  if ($job_data['show_id'] !== null) {
    // Check whether a higher job is queued
    $highers = \App\Job::higherThan($job_data['job_task'], $job_data['show_id']);
    if (count($highers) > 0) {
      foreach ($highers as $higher) {
        $higher->elevateQueue($queue);
      }
      return;
    }

    // Check whether the same job is already queued
    $duplicates = \App\Job::where([
      ['job_task', '=', $job_data['job_task']],
      ['show_id', '=', $job_data['show_id']],
      ['job_data', '=', json_encode($job_data['job_data'])],
      ['reserved_at', '=', null],
    ])->get();
    if (count($duplicates) > 0) {
      foreach ($duplicates as $duplicate) {
        $duplicate->elevateQueue($queue);
      }
      return;
    }

    // Remove any lower jobs
    $newQueue = \App\Job::deleteLowerThan($job_data['job_task'], $job_data['show_id']);
    if (in_array($newQueue, array_get_parents(config('queue.queuehierarchy'), $queue))) {
      $queue = $newQueue;
    }
  }

  // Add this job to the queue
  $job_id = dispatch($job->onQueue($queue));
  $job = \App\Job::find($job_id);
  $job->job_task = $job_data['job_task'];
  $job->show_id = $job_data['show_id'];
  $job->job_data = $job_data['job_data'];
  $job->save();
}

function handleJobFunction($job_task, $show_id, $job_data, $fromJob) {
  // Set job values
  $job_dbdata = [
    ['job_task', '=', $job_task],
    ['show_id', '=', $show_id],
    ['job_data', '=', json_encode($job_data)],
  ];
  // Remove any inferior queued jobs
  \App\Job::deleteLowerThan($job_task, $show_id);
  // If this is queued as a job, remove it from the queue
  \App\Job::where(array_merge($job_dbdata, [['reserved_at', '=', null]]))->delete();
  // Hovever, if that job is in progress, wait for it to complete instead of running this function,
  // but only if this function isn't started from the job
  if (!$fromJob && count(\App\Job::where(array_merge($job_dbdata, [['reserved_at', '!=', null]]))->get()) > 0) {
    while (count(\App\Job::where(array_merge($job_dbdata, [['reserved_at', '!=', null]]))->get()) > 0) {
      sleep(1);
    }
    return false;
  }
  return true;
}