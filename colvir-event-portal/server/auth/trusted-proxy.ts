import net from 'node:net';

/**
 * Список доверенных reverse-proxy. Заголовок с именем пользователя (Kerberos/NTLM
 * SSO) принимается только от этих адресов — иначе кто угодно, кто может достучаться
 * до Node напрямую, вошёл бы под любой учётной записью, просто выставив заголовок.
 */
export class TrustedProxyList {
  private readonly blockList = new net.BlockList();
  private readonly configured: boolean;

  constructor(entries: readonly string[]) {
    this.configured = entries.length > 0;

    for (const entry of entries) {
      const trimmed = entry.trim();
      if (!trimmed) continue;

      const [address, prefixRaw] = trimmed.split('/');
      const type = net.isIPv6(address) ? 'ipv6' : net.isIPv4(address) ? 'ipv4' : undefined;

      if (!type) {
        throw new Error(`SSO_TRUSTED_PROXIES: "${entry}" не является корректным IP или CIDR`);
      }

      if (prefixRaw === undefined) {
        this.blockList.addAddress(address, type);
        continue;
      }

      const prefix = Number.parseInt(prefixRaw, 10);
      const maxPrefix = type === 'ipv6' ? 128 : 32;
      if (!Number.isInteger(prefix) || prefix < 0 || prefix > maxPrefix) {
        throw new Error(`SSO_TRUSTED_PROXIES: некорректная длина префикса в "${entry}"`);
      }
      this.blockList.addSubnet(address, prefix, type);
    }
  }

  /** Приводит ::ffff:10.0.0.1 к 10.0.0.1, иначе проверка подсети IPv4 не сработает. */
  private static normalize(address: string): string {
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
    return mapped ? mapped[1] : address;
  }

  isTrusted(address: string | undefined | null): boolean {
    if (!this.configured || !address) return false;
    const normalized = TrustedProxyList.normalize(address);
    const type = net.isIPv6(normalized) ? 'ipv6' : net.isIPv4(normalized) ? 'ipv4' : undefined;
    if (!type) return false;
    return this.blockList.check(normalized, type);
  }
}
