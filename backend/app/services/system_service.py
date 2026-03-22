import time

import psutil

from app.schemas.system import DiskInfo, SystemStats

_boot_time = psutil.boot_time()


class SystemService:
    def get_stats(self) -> SystemStats:
        cpu = psutil.cpu_percent(interval=0.1)
        ram = psutil.virtual_memory()
        disk = psutil.disk_usage("/")
        net = psutil.net_io_counters()
        uptime = int(time.time() - _boot_time)

        return SystemStats(
            cpu_percent=round(cpu, 1),
            ram_percent=round(ram.percent, 1),
            ram_used_gb=round(ram.used / 1024**3, 2),
            ram_total_gb=round(ram.total / 1024**3, 2),
            disk_percent=round(disk.percent, 1),
            disk_used_gb=round(disk.used / 1024**3, 2),
            disk_total_gb=round(disk.total / 1024**3, 2),
            net_rx_bytes=net.bytes_recv,
            net_tx_bytes=net.bytes_sent,
            uptime_seconds=uptime,
        )

    def get_disks(self) -> list[DiskInfo]:
        disks = []
        for part in psutil.disk_partitions(all=False):
            try:
                usage = psutil.disk_usage(part.mountpoint)
            except PermissionError:
                continue
            disks.append(
                DiskInfo(
                    device=part.device,
                    mountpoint=part.mountpoint,
                    fstype=part.fstype,
                    total_gb=round(usage.total / 1024**3, 2),
                    used_gb=round(usage.used / 1024**3, 2),
                    free_gb=round(usage.free / 1024**3, 2),
                    percent=round(usage.percent, 1),
                )
            )
        return disks


system_service = SystemService()
